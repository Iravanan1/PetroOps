import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Initiating database seeding sequence...');

  // 1. Create Tenant (BPCL Dealer)
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-bpcl-01' },
    update: {},
    create: {
      id: 'tenant-bpcl-01',
      name: 'BPCL Retail Fuels Network',
      legalName: 'Bharat Petroleum Dealer Corp',
      gstin: '27AAAAA1111A1Z1'
    }
  });
  console.log(`[Seed] Created Tenant: ${tenant.name}`);

  // 2. Create User (Manager)
  const passwordHash = crypto.createHash('sha256').update('SecurePass2026!').digest('hex');
  const user = await prisma.user.upsert({
    where: { email: 'manager@petroops.in' },
    update: {},
    create: {
      id: 'user-manager-01',
      tenantId: tenant.id,
      email: 'manager@petroops.in',
      passwordHash,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      role: 'STATION_MANAGER',
      isActive: true
    }
  });
  console.log(`[Seed] Created User: ${user.email}`);

  // 3. Create Fuel Station Branch
  const station = await prisma.fuelStation.upsert({
    where: { id: 'station-branch-04' },
    update: {},
    create: {
      id: 'station-branch-04',
      tenantId: tenant.id,
      name: 'BPCL Smart Station Branch #04',
      location: 'Western Express Highway, Mumbai',
      timezone: 'Asia/Kolkata'
    }
  });
  console.log(`[Seed] Created Fuel Station: ${station.name}`);

  // 4. Create Fuel Tanks
  const tank1 = await prisma.tank.create({
    data: {
      stationId: station.id,
      code: 'T1',
      fuelType: 'Speed 97',
      capacityLiters: 20000,
      currentLevel: 14820,
      waterLevel: 8.0,
      temperature: 24.5
    }
  });
  const tank2 = await prisma.tank.create({
    data: {
      stationId: station.id,
      code: 'T2',
      fuelType: 'Octane 95',
      capacityLiters: 20000,
      currentLevel: 18400,
      waterLevel: 6.0,
      temperature: 24.8
    }
  });
  const tank3 = await prisma.tank.create({
    data: {
      stationId: station.id,
      code: 'T3',
      fuelType: 'High-Speed Diesel',
      capacityLiters: 40000,
      currentLevel: 31200,
      waterLevel: 12.0,
      temperature: 25.1
    }
  });
  console.log('[Seed] Created Fuel Tanks (Speed 97, Octane 95, Diesel)');

  // 5. Create Dispenser Pump
  const pump = await prisma.pump.create({
    data: {
      stationId: station.id,
      name: 'Dispenser 01',
      model: 'Gilbarco Horizon',
      protocol: 'Gilbarco-2wire',
      connectionUrl: '/dev/tty.usbserial-FCC01',
      isActive: true
    }
  });
  console.log(`[Seed] Created Dispenser Pump: ${pump.name}`);

  // 6. Create Nozzles
  const nozzle1 = await prisma.nozzle.create({
    data: {
      pumpId: pump.id,
      tankId: tank1.id,
      nozzleNumber: 1,
      totalizerLiters: 489201.25,
      totalizerCash: 1782901.00
    }
  });
  const nozzle2 = await prisma.nozzle.create({
    data: {
      pumpId: pump.id,
      tankId: tank3.id,
      nozzleNumber: 2,
      totalizerLiters: 890250.50,
      totalizerCash: 89025050.00
    }
  });
  console.log('[Seed] Created Nozzles linked to Tanks');

  // 7. Create Shift
  const shift = await prisma.shift.create({
    data: {
      stationId: station.id,
      supervisorId: user.id,
      shiftName: 'Morning Shift A',
      startTime: new Date(),
      isClosed: false,
      cashExpected: 0.0,
      cashCollected: 0.0,
      variance: 0.0
    }
  });
  console.log(`[Seed] Created Active Shift: ${shift.shiftName}`);

  // 8. Create Sales
  await prisma.sale.create({
    data: {
      shiftId: shift.id,
      nozzleId: nozzle1.id,
      litersSold: 25.5,
      pricePerLiter: 104.2,
      amount: 2657.1,
      paymentMethod: 'UPI',
      startTotalizer: 489175.75,
      endTotalizer: 489201.25
    }
  });
  await prisma.sale.create({
    data: {
      shiftId: shift.id,
      nozzleId: nozzle2.id,
      litersSold: 50.0,
      pricePerLiter: 92.5,
      amount: 4625.0,
      paymentMethod: 'CASH',
      startTotalizer: 890200.50,
      endTotalizer: 890250.50
    }
  });
  console.log('[Seed] Created Sales entries for active shift');

  // 9. Create Inventory entries
  await prisma.inventory.create({
    data: {
      stationId: station.id,
      itemCode: 'MOBIL_1_5W30',
      description: 'Mobil 1 5W-30 Premium Engine Oil 1L',
      unitPrice: 950.0,
      quantityInStock: 25,
      reorderLevel: 5
    }
  });
  console.log('[Seed] Created Lubricant Inventory entries');

  console.log('[Seed] Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed] Seeding sequence crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
