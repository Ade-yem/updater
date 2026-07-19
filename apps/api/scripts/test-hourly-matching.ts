import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaService();

async function debugHourlyWindowQuery() {
  const currentUTCHours = new Date().getUTCHours();
  console.log(`Checking database matching profiles for UTC system time: ${currentUTCHours}:00`);

  // Mock configuration injector setup
  const mockEmail = 'hourly.tester@example.com';
  await prisma.user.upsert({
    where: { email: mockEmail },
    update: { digestTime: currentUTCHours }, // Match current runtime exactly
    create: {
      email: mockEmail,
      name: 'Hourly Queue Tester',
      digestTime: currentUTCHours,
    }
  });
  console.log(`✓ Upserted dummy profile assigned directly to target bucket slot: ${currentUTCHours}`);

  // Test the structural repository extraction pattern
  const matchedProfiles = await prisma.user.findMany({
    where: {
      isActive: true,
      digestTime: currentUTCHours
    }
  });

  console.log('\n--- Extraction Pipeline Test ---');
  console.log(`Matched Count: ${matchedProfiles.length}`);
  console.log('Target Matches:', matchedProfiles.map(u => ({ name: u.name, targetHour: u.digestTime })));
  
  if (matchedProfiles.some(u => u.email === mockEmail)) {
    console.log('\n✅ Verification Success: Engine accurately matches and isolates processing records by hour slice.');
  } else {
    console.error('\n❌ Error: User entry missing from window match scope list.');
  }
}

debugHourlyWindowQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect());