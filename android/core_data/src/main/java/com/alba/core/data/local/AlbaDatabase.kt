package com.alba.core.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [LocalGameSession::class, SyncQueueItem::class],
    version = 1,
    exportSchema = false
)
abstract class AlbaDatabase : RoomDatabase() {
    abstract fun gameSessionDao(): GameSessionDao
    abstract fun syncQueueDao(): SyncQueueDao

    companion object {
        @Volatile
        private var INSTANCE: AlbaDatabase? = null

        fun getInstance(context: Context): AlbaDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AlbaDatabase::class.java,
                    "alba_local.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
