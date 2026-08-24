const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'DOCTOR' }});
  console.log('Doctors before:', users.length);
  if (users.length > 0) {
    try {
      await prisma.user.delete({ where: { id: users[0].id }});
      console.log('Deleted successfully');
    } catch (e) {
      console.error('Error deleting:', e);
    }
  }
}
main().finally(() => prisma.$disconnect());
