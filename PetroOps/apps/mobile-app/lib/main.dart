import 'package:flutter/material';
import 'core/persistence/secure_database.dart';
import 'presentation/screens/dip_entry_screen.dart';
import 'presentation/screens/tanker_receiving_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize local SQLite database cache on startup
  await SecureDatabaseHelper.database;
  
  runApp(const PetroOpsMobileApp());
}

class PetroOpsMobileApp extends StatelessWidget {
  const PetroOpsMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PetroOps Mobile',
      theme: ThemeData.dark().copyWith(
        primaryColor: Colors.emerald,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
      ),
      home: const MobileDashboardScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class MobileDashboardScreen extends StatelessWidget {
  const MobileDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PetroOps Attendant Hub', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'FORECOURT QUICK ACTIONS',
              style: TextStyle(color: Colors.slate, letterSpacing: 1.5, fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(height: 16),

            // Link to Dip Entry
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E293B),
                padding: const EdgeInsets.all(20),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const DipEntryScreen()),
                );
              },
              child: const Row(
                children: [
                  Text('🛢️', style: TextStyle(fontSize: 24)),
                  SizedBox(width: 16),
                  Text('New Tank Dip Entry', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Link to Tanker Receiving
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E293B),
                padding: const EdgeInsets.all(20),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const TankerReceivingScreen()),
                );
              },
              child: const Row(
                children: [
                  Text('🚛', style: TextStyle(fontSize: 24)),
                  SizedBox(width: 16),
                  Text('Tanker Fuel Receiving', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
