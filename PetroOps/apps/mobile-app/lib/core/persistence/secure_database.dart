import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class SecureDatabaseHelper {
  static Database? _database;

  static Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  static Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'petroops_offline.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE dip_entries (
            id TEXT PRIMARY KEY,
            tank_id TEXT NOT NULL,
            fuel_level_mm REAL NOT NULL,
            water_level_mm REAL NOT NULL,
            liters_calculated REAL NOT NULL,
            sync_status TEXT NOT NULL,
            timestamp TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE sales_queue (
            id TEXT PRIMARY KEY,
            shift_id TEXT NOT NULL,
            nozzle_id TEXT NOT NULL,
            liters_sold REAL NOT NULL,
            amount REAL NOT NULL,
            sync_status TEXT NOT NULL,
            timestamp TEXT NOT NULL
          )
        ''');
      },
    );
  }
}
