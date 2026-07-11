import { prisma } from '@/lib/prisma';

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.scheduleAssignment.deleteMany();
  await prisma.member.deleteMany();

  // Create sample members
  const members = await Promise.all([
    // Group 1 - Chiefs
    prisma.member.create({
      data: {
        name: 'Alice Johnson',
        specialty: 'Mechanic',
        position: 'chief',
        group: 1,
      },
    }),
    prisma.member.create({
      data: {
        name: 'Bob Smith',
        specialty: 'Mechanic',
        position: 'chief',
        group: 1,
      },
    }),
    // Group 1 - Guards
    prisma.member.create({
      data: {
        name: 'Charlie Davis',
        specialty: 'Deckhands',
        position: 'guard',
        group: 1,
      },
    }),
    prisma.member.create({
      data: {
        name: 'Diana Wilson',
        specialty: 'Deckhands',
        position: 'guard',
        group: 1,
      },
    }),
    prisma.member.create({
      data: {
        name: 'Eva Martinez',
        specialty: 'Deckhands',
        position: 'guard',
        group: 1,
      },
    }),
    // Group 2 - Chiefs
    prisma.member.create({
      data: {
        name: 'Frank Brown',
        specialty: 'Mechanic',
        position: 'chief',
        group: 2,
      },
    }),
    prisma.member.create({
      data: {
        name: 'Grace Lee',
        specialty: 'Mechanic',
        position: 'chief',
        group: 2,
      },
    }),
    // Group 2 - Guards
    prisma.member.create({
      data: {
        name: 'Henry Taylor',
        specialty: 'Deckhands',
        position: 'guard',
        group: 2,
      },
    }),
    prisma.member.create({
      data: {
        name: 'Iris Anderson',
        specialty: 'Deckhands',
        position: 'guard',
        group: 2,
      },
    }),
    prisma.member.create({
      data: {
        name: 'Jack Thomas',
        specialty: 'Deckhands',
        position: 'guard',
        group: 2,
      },
    }),
  ]);

  console.log(`✅ Created ${members.length} sample members`);
  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
