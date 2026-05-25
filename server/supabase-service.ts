import { createClient } from "@supabase/supabase-js";
import { dbService } from "./db-service";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    }) 
  : null;

class SupabaseService {
  private isReadOnlyFallback = false;
  private syncInProgress = false;
  private pushQueue: Array<{ name: string; data: any[] }> = [];
  private lastPushTimestamps: Record<string, number> = {};

  public isConfigured(): boolean {
    return !!supabase;
  }

  /**
   * Safe check to identify if the required schema table exists on the project
   */
  public async verifyAndInitializeSchema(): Promise<boolean> {
    if (!supabase) return false;

    try {
      console.log("Supabase URL is available. Verifying 'chakki_collections' table schema...");
      
      const { data, error } = await supabase
        .from("chakki_collections")
        .select("collection_name")
        .limit(1);

      if (error) {
        console.warn(
          "⚠️ Supabase table 'chakki_collections' not found. " +
          "Falling back to local-only mode. Error: " + error.message
        );
        this.isReadOnlyFallback = true;
        return false;
      }

      console.log("✅ Supabase 'chakki_collections' schema verified.");
      return true;
    } catch (e: any) {
      console.error("❌ Failed to verify Supabase schema:", e.message || e);
      this.isReadOnlyFallback = true;
      return false;
    }
  }

  /**
   * Pulls the absolute state from Supabase to local DB cache
   */
  public async pullAllData(): Promise<void> {
    if (!supabase || this.isReadOnlyFallback || this.syncInProgress) return;

    this.syncInProgress = true;
    try {
      const { data, error } = await supabase
        .from("chakki_collections")
        .select("*");

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`📥 Pulling ${data.length} collections from Supabase cloud...`);
        let importedCount = 0;
        
        for (const row of data) {
          const { collection_name, data: collectionData } = row;
          if (collection_name && Array.isArray(collectionData)) {
            dbService.setCollectionFromSupabase(collection_name, collectionData);
            importedCount++;
          }
        }
        
        // Save to disk WITHOUT triggering the push callback loop
        if (importedCount > 0) {
          // Temporarily disable callback to avoid push-back
          const originalCallback = dbService.onSaveCallback;
          dbService.onSaveCallback = undefined;
          dbService.save();
          dbService.onSaveCallback = originalCallback;
          console.log("💾 Cloud state synced to local storage.");
        }
      } else {
        console.log("ℹ️ Cloud is empty. Preparing to seed local data to Supabase...");
        this.syncInProgress = false; // release lock to allow push
        await this.pushAllData();
        return;
      }
    } catch (error: any) {
      console.error("❌ Failed to pull cloud data:", error.message || error);
    } finally {
      this.syncInProgress = false;
      this.processQueue(); // Check if any pushes were queued during pull
    }
  }

  /**
   * Push local initial seeding datasets to Supabase server
   */
  public async pushAllData(): Promise<void> {
    if (!supabase || this.isReadOnlyFallback) return;

    try {
      const rawDb = dbService.getRawDB();
      const collections = Object.keys(rawDb);
      
      console.log(`📤 Seeding ${collections.length} collections to Supabase...`);
      for (const col of collections) {
        const payload = rawDb[col as keyof typeof rawDb];
        this.queuePush(col, payload);
      }
    } catch (e: any) {
      console.error("❌ Failed to start dataset seeding:", e.message || e);
    }
  }

  /**
   * Add a collection update to the outbound sync queue
   */
  public queuePush(collectionName: string, payload: any[]): void {
    if (!supabase || this.isReadOnlyFallback) return;
    
    // De-duplicate: If already in queue, update its data instead of adding another entry
    const existingIndex = this.pushQueue.findIndex(q => q.name === collectionName);
    if (existingIndex > -1) {
      this.pushQueue[existingIndex].data = payload;
    } else {
      this.pushQueue.push({ name: collectionName, data: payload });
    }
    
    this.processQueue();
  }

  private isProcessingQueue = false;
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.syncInProgress || this.pushQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    try {
      while (this.pushQueue.length > 0) {
        const item = this.pushQueue.shift();
        if (!item) continue;
        
        await this.performPush(item.name, item.data);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async performPush(collectionName: string, payload: any[]): Promise<void> {
    if (!supabase) return;

    try {
      this.lastPushTimestamps[collectionName] = Date.now();
      const { error } = await supabase
        .from("chakki_collections")
        .upsert({
          collection_name: collectionName,
          data: payload,
          updated_at: new Date().toISOString()
        }, { onConflict: "collection_name" });

      if (error) {
        console.error(`❌ Push failed for '${collectionName}':`, error.message);
      } else {
        console.log(`📤 Pushed '${collectionName}' to Supabase.`);
      }
    } catch (err: any) {
      console.error(`❌ Network error pushing '${collectionName}':`, err.message || err);
    }
  }

  public async pushCollection(collectionName: string, payload: any[]): Promise<void> {
    this.queuePush(collectionName, payload);
  }

  /**
   * Initialize standard listeners for real-time Postgres changes
   */
  public subscribeToRealtimeChanges(): void {
    if (!supabase || this.isReadOnlyFallback) return;

    console.log("📡 Subscribing to Supabase Realtime changes for 'chakki_collections'...");
    
    supabase
      .channel("supabase-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chakki_collections"
        },
        async (payload) => {
          if (this.syncInProgress) return;

          try {
            const row = payload.new as any;
            if (row && row.collection_name && Array.isArray(row.data)) {
              // Ignore updates for collections we just pushed (avoid overwriting rapid local edits with cloud-echoes)
              const lastPush = this.lastPushTimestamps[row.collection_name] || 0;
              if (Date.now() - lastPush < 5000) {
                return;
              }

              // Lock sync engine to avoid triggering callback ping-pong
              this.syncInProgress = true;
              
              // Deep compare stringified representation to verify if there was a real mutation
              const rawDb = dbService.getRawDB() as any;
              const localData = rawDb[row.collection_name];
              if (localData && JSON.stringify(localData) !== JSON.stringify(row.data)) {
                console.log(`📡 Realtime update received for '${row.collection_name}' from cloud...`);
                dbService.setCollectionFromSupabase(row.collection_name, row.data);
                dbService.save();
              }
            }
          } catch (e: any) {
            console.error("Error applying realtime update:", e.message || e);
          } finally {
            this.syncInProgress = false;
          }
        }
      )
      .subscribe((status) => {
        console.log(`Supabase Realtime Channel status: ${status}`);
      });
  }
}

export const supabaseService = new SupabaseService();

// Register the db callback to persist local edits in real-time to Supabase
if (supabaseService.isConfigured()) {
  dbService.onSaveCallback = (colName?: string) => {
    if (colName) {
      supabaseService.pushCollection(colName, dbService.getRawDB()[colName as keyof any]);
    } else {
      supabaseService.pushAllData();
    }
  };
}
