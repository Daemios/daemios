export default {
  namespaced: true,
  state: {
    db: {
      races: [
        { race_id: 1, label: 'Wood Elf', description: 'Wood Elves, also known as the Ithilrendi, are commonly described as having olive skin and hair matching the various autumnal colors of the leaves. They exceed at working with nature and animals, and their natural and effortless grace is quite useful during feats of great athleticism.' },
        { race_id: 2, label: 'Moon Elf', description: 'The most elusive of the elves, Ulurendi are the fairest-skinned of their brothers and sisters, featuring near pure-white skin and hair. Their long-standing bond with the power of the moon has steered their culture towards the arcane, and as a result Moon Elves almost always have a level of arcane knowledge in addition to the typical elven strengths.' },
        { race_id: 3, label: 'Sea Elf', description: 'Sea elves, or Naurendi, lack the tails of Merfolk (which they are often confused with), but share much of their other features, such as scaly green or blue skin, small vestigal fins along their arms and legs, and functional gills. They share a deep tie to nature like their Wood Elf brethren, but due to their weakness out of water, most of the natural aestheticism of other Elves is lost on them and the toll of the air on their naked skin causes light distraction.' },
        { race_id: 4, label: 'Half Orc', description: 'Usually the result of darker methods of reproduction, Half Orcs have very few spaces where they are welcomed in the world. As full orcs are mostly feral, a stigma follows Half-Orcs around that crosses borders and continents.' },
        { race_id: 5, label: 'Mountain Dwarf', description: 'Mountain dwarves are what most of the people in the world think of when Dwarves are mentioned. Excellent craftsmen, these people take part in generation-long city-building projects in which to house themselves. Some of the greatest wonders in the world are these massive carved mountain-cities. Mountain dwarves grow up with a natural affinity towards altheticism and fine motor control.' },
        { race_id: 6, label: 'Dwetherlin', description: 'Taking technological prowess to the extreme, these descendants of ancient mountain dwarf clans reside in massive floating airships with the rest of their specific clan, which basically equates to their extended family. All those who serve aboard an airship develop some sense of the arcane magics that propel the ship forward, and train their minds to see into the innerworkings of the complex machines that surround them.' },
        { race_id: 7, label: 'Critterling', description: 'These short, furred oddities resemble several different types of small mammals. Standing roughly as tall as a Dwarf, they usually prefer the natural places in the world, though there is a not-insignificant portion of their population living in large cities. Naturally stealthy and mentally sharp as a tack, these reclusive people prefer the outskirts of society where they live in small familial packs.' },
        { race_id: 8, label: 'Human', description: 'The elder race. While short lived compared to some of their descendants, humans are the riverbank from which the forest of other races has grown. Humanity rules over the majority of territory in the world, and are by far the most prominent race. Versatile and naturally viewed as socially superior to most other races, Humanity has spread itself over the plains, mountains, forests and oceans of the world.' },
        { race_id: 9, label: 'Mantii', description: 'One of the strangest looking of the races, Mantii are insect-like humanoids with large, flat heads and two enormous, bulbous compound eyes. While often hunted purely based on their appearance and fear, Mantii are actually one of the kinder races, tending to their home forests with a delicate grace and respect.' },
        { race_id: 10, label: 'Savrian', description: 'With protruding scales that give them a natural defense and an intimidating look, the lizardfolk of the deserts are often viewed by the kings and queens of the lands as trouble not worth having, and are left to their own devices in the land where few other races can survive. A significant portion of their population is dedicated to tending of the great Singing Crystals; enormous structures require constant attention serving to both condense what little moisture the desert air holds and act as sacred sites for their racial religion.' },
        { race_id: 11, label: 'Etter', description: 'Etter, sometimes known as naturelings or ents, are odd and extremely rare creatures that live solitary lives. Measuring just a few feet tall for many years of their lives and having a naturally bark-like skin, Etter are stirred to life, starting as a small tough rootlike creature that forms deep underground and only emerges once it has absorbed enough nutrients from the surrounding soil. Etter often and inexplicably have an almost reflexive knowledge about nature and the whims of the Divines that is hard to explain given their earthy origins.' },
        { race_id: 12, label: 'Tyrak', description: 'From the Great Eyries across the world, the once-reclusive Tyrak have again descended into the rest of the world. Dominated by a fiercely matriarchal society that values both physical prowess and a honed mind, Tyrak are not recognized as members of Tyrian society until they take part in Decimation, a ritual celebration once a year where the newest generation must fight to the death until one tenth lay dead.' },
      ],
      archetype: {
        roles: [
          { archetype_role_id: 1, label: 'Healer', description: 'Focus on repairing damage instead of dealing it.' },
          { archetype_role_id: 2, label: 'Damage', description: 'Things need bonk? You bonk.' },
          { archetype_role_id: 3, label: 'Debuff', description: 'Killing your enemies through control.' },
          { archetype_role_id: 4, label: 'Utility', description: 'Buff allies and manipulate the battlefield.' },
          { archetype_role_id: 5, label: 'Summoner', description: 'Become a puppet master and control the spirits.' },
        ],
        ranges: {
          1: { archetype_role_id: 1, label: 'Melee', description: 'Disables some ranges, but adds more HP and Power.' },
          2: { archetype_role_id: 2, label: 'Mix', description: 'Jack of all trades, without any specialization.' },
          3: {
            archetype_role_id: 3,
            label: 'Ranged',
            description: 'Grants a range modifier to all abilties but reduces HP.',
          },
        },
      },
      ability: {
        range: {
          1: {
            ability_range_id: 1, label: 'Self', description: 'Self targeting can only be cast on yourself and cannot be increased by +/- range modifiers.', tag: 'self', additional_range: 0,
          },
          2: {
            ability_range_id: 2, label: 'Touch', description: 'Touch abilities can only target the eight surrounding squares and cannot be increased by +/- range modifiers.', tag: 'touch', additional_range: 0,
          },
          3: {
            ability_range_id: 3, label: 'Short', description: 'Short range abilities have a base range of 2 squares and cannot be increased by +/- range modifiers.', tag: 'short', additional_range: 1,
          },
          4: {
            ability_range_id: 4, label: 'Medium ', description: 'Medium range abilities have a base range of 6 squares, modifiable by +/- range modifiers.', tag: 'medium', additional_range: 1,
          },
          5: {
            ability_range_id: 5, label: 'Long', description: 'Long range abilities have a base range of 10 squares, modifiable by +/- range modifiers.', tag: 'long', additional_range: 1,
          },
        },
        shape: {
          1: {
            ability_shape_id: 1, label: 'Single', description: null, tag: 'single', additional_area: 0,
          },
          2: {
            ability_shape_id: 2, label: 'Diamond', description: null, tag: 'diamond', additional_area: 1,
          },
          3: {
            ability_shape_id: 3, label: 'Square', description: null, tag: 'square', additional_area: 1,
          },
          4: {
            ability_shape_id: 4, label: 'Cross', description: null, tag: 'cross', additional_area: 1,
          },
        },
        type: {
          1: {
            ability_type_id: 1, label: 'Weapon', description: null, tag: 'weapon',
          },
          2: {
            ability_type_id: 2, label: 'Word', description: null, tag: 'word',
          },
          3: {
            ability_type_id: 3, label: 'Edict', description: null, tag: 'edict',
          },
          4: {
            ability_type_id: 4, label: 'Buff', description: null, tag: 'buff',
          },
          5: {
            ability_type_id: 5, label: 'Debuff', description: null, tag: 'debuff',
          },
          6: {
            ability_type_id: 6, label: 'Summon', description: null, tag: 'summon',
          },
          7: {
            ability_type_id: 7, label: 'Positional', description: null, tag: 'positional',
          },
          8: {
            ability_type_id: 8, label: 'Wall', description: null, tag: 'wall',
          },
        },
      },
      elements: {
        0: {
          name: 'Fire',
          description: 'Fire description',
          imgs: {
            core: '/img/cores/fire.jpg',
          },
          color: '',
        },
        1: {
          name: 'Nature',
          description: 'Nature description',
          imgs: {
            core: '/img/cores/nature.jpg',
          },
          color: '',
        },
        2: {
          name: 'Ice',
          description: 'Ice description',
          imgs: {
            core: '/img/cores/ice.jpg',
          },
          color: '',
        },
        3: {
          name: 'Lightning',
          description: 'Lightning description',
          imgs: {
            core: '/img/cores/lightning.jpg',
          },
          color: '',
        },
        4: {
          name: 'Water',
          description: 'Water description',
          imgs: {
            core: '/img/cores/water.jpg',
          },
          color: '',
        },
      },
    },

    // This is necessary because vuetify indexes from 0 on its
    // selects and doesn't allow key/value pairs for the items it lists
    selects: {
      ability: {
        range: [
          {
            ability_range_id: 1, label: 'Self', description: 'Self targeting can only be cast on yourself and cannot be increased by +/- range modifiers.', tag: 'self', additional_range: 0,
          },
          {
            ability_range_id: 2, label: 'Touch', description: 'Touch abilities can only target the eight surrounding squares and cannot be increased by +/- range modifiers.', tag: 'touch', additional_range: 0,
          },
          {
            ability_range_id: 3, label: 'Short', description: 'Short range abilities have a base range of 2 squares and cannot be increased by +/- range modifiers.', tag: 'short', additional_range: 1,
          },
          {
            ability_range_id: 4, label: 'Medium ', description: 'Medium range abilities have a base range of 6 squares, modifiable by +/- range modifiers.', tag: 'medium', additional_range: 1,
          },
          {
            ability_range_id: 5, label: 'Long', description: 'Long range abilities have a base range of 10 squares, modifiable by +/- range modifiers.', tag: 'long', additional_range: 1,
          },
        ],
        shape: [
          {
            ability_shape_id: 1, label: 'Single', description: null, tag: 'single', additional_area: 0,
          },
          {
            ability_shape_id: 2, label: 'Diamond', description: null, tag: 'diamond', additional_area: 1,
          },
          {
            ability_shape_id: 3, label: 'Square', description: null, tag: 'square', additional_area: 1,
          },
          {
            ability_shape_id: 4, label: 'Cross', description: null, tag: 'cross', additional_area: 1,
          },
        ],
        type: [
          {
            ability_type_id: 1, label: 'Weapon', description: null, tag: 'weapon',
          },
          {
            ability_type_id: 2, label: 'Word', description: null, tag: 'word',
          },
          {
            ability_type_id: 3, label: 'Edict', description: null, tag: 'edict',
          },
          {
            ability_type_id: 4, label: 'Buff', description: null, tag: 'buff',
          },
          {
            ability_type_id: 5, label: 'Debuff', description: null, tag: 'debuff',
          },
          {
            ability_type_id: 6, label: 'Summon', description: null, tag: 'summon',
          },
          {
            ability_type_id: 7, label: 'Positional', description: null, tag: 'positional',
          },
          {
            ability_type_id: 8, label: 'Wall', description: null, tag: 'wall',
          },
        ],
      },
    },

    img: {
      potion: {
        poison: {
          1: 'https://cdn.dribbble.com/users/1786194/screenshots/6101479/dribble3.png',
          2: 'https://cdnb.artstation.com/p/assets/images/images/027/858/635/large/zeynep-kuk-icon.jpg',
        },
        health: {
          1: 'https://i.pinimg.com/originals/3e/a0/41/3ea041bbf5a95cab4e1361528ba57f1f.jpg',
          2: 'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/e611be54929515.5975d7c776e1c.jpg',
        },
        other: {
          1: 'https://i.pinimg.com/564x/70/8a/49/708a49c382422e866d4b144bac9d1313.jpg',
          2: 'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/8c706b54929515.5975d7c777222.jpg',
          3: 'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/fb3bfd54929515.5975d7c77633e.jpg',
          4: 'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/84ffa354929515.5975d7c775ac5.jpg',
        },
      },
    },
  },
};
