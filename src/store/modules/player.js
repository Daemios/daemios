export default {
  namespaced: true,
  state: {
    player_id: 1,
    character: {
      character_id: 1,
      firstName: 'First',
      lastName: 'Last',
      race: {
        label: 'Etter',
        description: 'Etter, sometimes known as naturelings or ents, are odd and extremely rare creatures that live solitary lives. Measuring just a few feet tall for many years of their lives and having a naturally bark-like skin, Etter are stirred to life, starting as a small tough rootlike creature that forms deep underground and only emerges once it has absorbed enough nutrients from the surrounding soil. Etter often and inexplicitly have an almost reflexive knowledge about nature and the whims of the Divines that is hard to explain given their earthy origins.',
        bonuses: {
          1: 4, // index is the id of the skill
          2: -1,
        },
      },
      archetype: {
        range: {
          range_id: 1,
          label: 'Melee',
          description: 'Disables some ranges, but adds more HP and Power.',
        },
        role: {
          role_id: 2,
          label: 'Damage',
          description: 'Things need bonk? You bonk.',
        },
      },
      cores: {
        1: {
          id: 1,
          label: 'My Best Spell',
          prefix: 'Cracked',
          tier: 1,
          sockets: 1,

          range: 2,
          shape: 1,
          type: 1,

          power: 0,
          cost: 0,
          cooldown: 0,
        },
        2: {
          id: 2,
          label: 'My Second Best Spell',
          prefix: 'Cracked',
          tier: 1,
          sockets: 1,

          range: 2,
          shape: 1,
          type: 1,

          power: 0,
          cost: 0,
          cooldown: 0,
        },
      },
      equipped: {
        trinket1: {
          label: 'Red Gatorade',
          slot: 'Relic',
          rarity: 'Common',
          img: 'https://i.pinimg.com/originals/3e/a0/41/3ea041bbf5a95cab4e1361528ba57f1f.jpg',
          description: 'This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. This is a long description. ',
        },
        trinket2: {
          label: 'Shaper\'s Presence',
          slot: 'Relic',
          rarity: 'Common',
          img: 'https://cdnb.artstation.com/p/assets/images/images/005/209/787/large/vladimir-somov-vladimir-somov-for-honor-amulet-01.jpg?1489346383',
        },
        trinket3: {
          label: 'Three-Stone Ring',
          slot: 'Relic',
          rarity: 'Common',
          img: 'https://static0.cbrimages.com/wordpress/wp-content/uploads/2020/09/ring-of-three-wishes.jpg?q=50&fit=crop&w=740&h=370&dpr=1.5',
        },
        head: {
          label: 'Weirdly Big',
          slot: 'Head',
          rarity: 'Common',
        },
        neck: {
          label: 'Fat',
          slot: 'Neck',
          rarity: 'Epic',
        },
        shoulders: {
          label: 'Girlish',
          slot: 'Shoulders',
          rarity: 'Common',
        },
        back: {
          label: 'Lacks Definition',
          slot: 'Back',
          rarity: 'Rare',
        },
        chest: {
          label: 'Un-Muscle\'d',
          slot: 'Chest',
          rarity: 'Uncommon',
        },
        hands: {
          label: 'Soft',
          slot: 'Hands',
          rarity: 'Common',
        },
        wrists: {
          label: 'Limp',
          slot: 'Wrists',
          rarity: 'Common',
        },
        waist: {
          label: 'Dummy THICC',
          slot: 'Waist',
          rarity: 'Common',
        },
        legs: {
          label: 'Toothpicks',
          slot: 'Legs',
          rarity: 'Common',
        },
        feet: {
          label: 'Oh, U Kno',
          slot: 'Feet',
          rarity: 'Common',
        },
        mainhand: {
          label: 'Kelipnir, Sword of the Magi',
          slot: 'Mainhand',
          rarity: 'Legendary',
          img: 'https://cdn1.epicgames.com/ue/product/Screenshot/screenshot017-1920x1080-bd10479bcca316db806c58b561f689d8.png?resize=1&w=1920',
          stats: [
            {
              label: 'Strength',
              value: 20,
            },
            {
              label: 'Stamina',
              value: 20,
            },
          ],
          effect: 'Kelipnir cleaves energy from it\'s target, reducing AP by 1.',
        },
        offhand: {
          label: 'Leodias, Bulwark of the Magi',
          slot: 'Offhand',
          rarity: 'Legendary',
          img: 'https://cdn1.epicgames.com/ue/product/Screenshot/screenshot023-1920x1080-201d344f81751604d996b6e8b6261ea8.png?resize=1&w=1920',
          stats: [
            {
              label: 'Defense',
              value: 20,
            },
            {
              label: 'Stamina',
              value: 20,
            },
          ],
          effect: null,
        },
      },
      inventory: [
        {
          label: 'Hardwood',
          rarity: 'Common',
          quantity: 23,
          description: 'This is a bundle of hardwood used for constructing tools and buildings.',
          img: 'https://cdna.artstation.com/p/assets/images/images/016/529/474/large/christina-kozlova-material-studies1-wood.jpg?1552496782',
        },
        {
          label: 'Iron Ore',
          rarity: 'Common',
          quantity: Math.floor(Math.random() * 100),
          description: 'Raw iron ore ready to be processed into ingots.',
          img: 'https://cdnb.artstation.com/p/assets/images/images/002/986/011/large/vera-velichko-22.jpg?1468145160',
        },
        {
          label: 'Iron Ore',
          rarity: 'Common',
          quantity: Math.floor(Math.random() * 100),
          description: 'Raw iron ore ready to be processed into ingots.',
          img: 'https://cdnb.artstation.com/p/assets/images/images/002/986/011/large/vera-velichko-22.jpg?1468145160',
        },
        {
          label: 'Iron Ore',
          rarity: 'Common',
          quantity: Math.floor(Math.random() * 100),
          description: 'Raw iron ore ready to be processed into ingots.',
          img: 'https://cdnb.artstation.com/p/assets/images/images/002/986/011/large/vera-velichko-22.jpg?1468145160',
        },
        {
          label: 'Iron Ore',
          rarity: 'Common',
          quantity: Math.floor(Math.random() * 100),
          description: 'Raw iron ore ready to be processed into ingots.',
          img: 'https://cdnb.artstation.com/p/assets/images/images/002/986/011/large/vera-velichko-22.jpg?1468145160',
        },
        {
          label: 'Iron Ore',
          rarity: 'Common',
          quantity: Math.floor(Math.random() * 100),
          description: 'Raw iron ore ready to be processed into ingots.',
          img: 'https://cdnb.artstation.com/p/assets/images/images/002/986/011/large/vera-velichko-22.jpg?1468145160',
        },
        {
          label: 'Iron Ore',
          rarity: 'Common',
          quantity: Math.floor(Math.random() * 100),
          description: 'Raw iron ore ready to be processed into ingots.',
          img: 'https://cdnb.artstation.com/p/assets/images/images/002/986/011/large/vera-velichko-22.jpg?1468145160',
        },
        {
          label: 'Iron Ore',
          rarity: 'Common',
          quantity: Math.floor(Math.random() * 100),
          description: 'Raw iron ore ready to be processed into ingots.',
          img: 'https://cdnb.artstation.com/p/assets/images/images/002/986/011/large/vera-velichko-22.jpg?1468145160',
        },
        {
          label: 'Iron Ore',
          rarity: 'Common',
          quantity: Math.floor(Math.random() * 100),
          description: 'Raw iron ore ready to be processed into ingots.',
          img: 'https://cdnb.artstation.com/p/assets/images/images/002/986/011/large/vera-velichko-22.jpg?1468145160',
        },
        {
          label: 'Iron Ore',
          rarity: 'Common',
          quantity: Math.floor(Math.random() * 100),
          description: 'Raw iron ore ready to be processed into ingots.',
          img: 'https://cdnb.artstation.com/p/assets/images/images/002/986/011/large/vera-velichko-22.jpg?1468145160',
        },
        {
          label: 'Bloodstone',
          rarity: 'Rare',
          quantity: 1,
          description: 'A rare gem with a connection to necromancy.',
          img: 'https://i.pinimg.com/originals/cc/d2/b6/ccd2b680faa9d5855232ecd54b40fa4b.jpg',
        },
      ],
    },
  },
};
