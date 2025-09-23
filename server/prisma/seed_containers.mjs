import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding containers (pockets + basic backpack) per character...')

  const characters = await prisma.character.findMany({ select: { id: true, name: true } })
  console.log(`Found ${characters.length} characters`)

  for (const ch of characters) {
    // Check if this character already has a Pockets container
    const hasPockets = await prisma.container.findFirst({
      where: { name: 'Pockets', characterId: ch.id }
    })

    if (!hasPockets) {
      await prisma.container.create({
        data: {
          name: 'Pockets',
          capacity: 4,
          lockType: null,
          characterId: ch.id,
          // pockets are non-removable so characters can't delete them
          removable: false
        }
      })
      console.log(`Created Pockets for character ${ch.id} (${ch.name})`)
    } else {
      console.log(`Pockets exists for character ${ch.id} (${ch.name})`) 
    }

    const hasBackpack = await prisma.container.findFirst({
      where: { name: 'Basic Backpack', characterId: ch.id }
    })

    if (!hasBackpack) {
      await prisma.container.create({
        data: {
          name: 'Basic Backpack',
          capacity: 16,
          lockType: null,
          characterId: ch.id,
          removable: true
        }
      })
      console.log(`Created Basic Backpack for character ${ch.id} (${ch.name})`)
    } else {
      console.log(`Basic Backpack exists for character ${ch.id} (${ch.name})`)
    }
  }

  console.log('Seeding containers complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
