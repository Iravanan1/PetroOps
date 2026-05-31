import 'package:sqflite/sqflite.dart';
import '../../core/network/api_client.dart';

class MobileDipEntry {
  final String id;
  final String tankId;
  final double fuelLevelMm;
  final double waterLevelMm;
  final double litersCalculated;
  final DateTime timestamp;

  MobileDipEntry({
    required this.id,
    required this.tankId,
    required this.fuelLevelMm,
    required this.waterLevelMm,
    required this.litersCalculated,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tank_id': tankId,
      'fuel_level_mm': fuelLevelMm,
      'water_level_mm': waterLevelMm,
      'liters_calculated': litersCalculated,
      'sync_status': 'PENDING',
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

class DipEntryRepository {
  final Database localDb;
  final ApiClient cloudApi;

  DipEntryRepository({required this.localDb, required this.cloudApi});

  /**
   * Commits the physical fuel dip reading locally to SQLite instantly,
   * then launches background upload thread to synchronize with cloud servers.
   */
  Future<void> submitDipEntry(MobileDipEntry entry) async {
    // 1. Write local persistence for offline reliability
    await localDb.insert(
      'dip_entries',
      entry.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    // 2. Dispatch to NestJS Central API
    try {
      final res = await cloudApi.post(
        '/api/v1/telemetry/dip-readings',
        data: {
          'id': entry.id,
          'tankId': entry.tankId,
          'fuelLevelMm': entry.fuelLevelMm,
          'waterLevelMm': entry.waterLevelMm,
          'litersCalculated': entry.litersCalculated,
          'timestamp': entry.timestamp.toIso8601String(),
        },
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        // Mark local cache row as completed
        await localDb.update(
          'dip_entries',
          {'sync_status': 'COMPLETED'},
          where: 'id = ?',
          whereArgs: [entry.id],
        );
      }
    } catch (e) {
      // Keep state as PENDING for delta sync queue retry loop
      print('[Mobile Sync] Cloud push deferred offline: $e');
    }
  }
}
