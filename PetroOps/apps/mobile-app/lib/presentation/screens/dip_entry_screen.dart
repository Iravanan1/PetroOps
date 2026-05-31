import 'package:flutter/material';

class DipEntryScreen extends StatefulWidget {
  const DipEntryScreen({super.key});

  @override
  State<DipEntryScreen> createState() => _DipEntryScreenState();
}

class _DipEntryScreenState extends State<DipEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fuelController = TextEditingController();
  final _waterController = TextEditingController();
  String _selectedTank = 'Tank #01 (Speed 97)';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      appBar: AppBar(
        title: const Text('New Tank Dip Entry', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B), // Slate 800
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Select Physical Tank',
                style: TextStyle(color: Colors.slateGD = Colors.slate, fontSize: 14, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 8),
              
              // Dropdown Selector (Optimized > 48px Height target)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                height: 56,
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedTank,
                    dropdownColor: const Color(0xFF1E293B),
                    style: const TextStyle(color: Colors.white, fontSize: 16),
                    iconEnabledColor: Colors.emerald,
                    items: <String>['Tank #01 (Speed 97)', 'Tank #02 (Octane 95)', 'Tank #03 (Diesel)']
                        .map((String value) {
                      return DropdownMenuItem<String>(
                        value: value,
                        child: Text(value),
                      );
                    }).toList(),
                    onChanged: (newValue) {
                      setState(() {
                        _selectedTank = newValue!;
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Fuel level input field
              TextFormField(
                controller: _fuelController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Fuel Level (mm)',
                  labelStyle: const TextStyle(color: Colors.slate),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  enabledBorder: OutlineInputBorder(
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Please enter physical mm height';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Water level input field
              TextFormField(
                controller: _waterController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Water Level (mm)',
                  labelStyle: const TextStyle(color: Colors.slate),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  enabledBorder: OutlineInputBorder(
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const Spacer(),

              // Submit Button (Optimized touch target)
              SizedBox(
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.emerald,
                    foregroundColor: const Color(0xFF0F172A),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Dip entry saved offline successfully.'),
                          backgroundColor: Colors.emerald,
                        ),
                      );
                    }
                  },
                  child: const Text('SUBMIT DIP ENTRY', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
