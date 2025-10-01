<template>
  <Cutscene
    :script="script"
    @finished="onFinished"
    @skipped="onSkipped"
  />
</template>

<script setup>
import { useRouter } from 'vue-router';
import Cutscene from '@/components/cutscenes/Cutscene.vue';

const router = useRouter();

const script = {
  actors: {
    shopkeeper: { 
        image: '/img/characters/shopkeeper.png', 
        position: 'right', 
        name: 'Shopkeeper'
    },
  },
  frames: [
    {
        type: 'text',
        text: { 
            string: 'You wake up and stumble into the building...',
            trigger: { next: 'confirm', text: 'Enter the shop', delay: 3000 }
        },
        audio: {
            channel: 'music',
            src: '/audio/shop_door.mp3',
        },
    },
    {
        type: 'dialog',
        dialog: [
            { 
                shopkeeper: 'Looking for some new constructs?',
                trigger: { next: 'confirm', text: 'What are constructs?' }
            },
            { 
                shopkeeper: "What do you mean you don't know what constructs are? Did you hit your head?", 
                trigger: { next: 'confirm', text: 'Well, actually...' }
            },
            { 
                shopkeeper: "Let me explain...", 
                trigger: { next: 'delay', delay: 3000 }
            },
        ],
        audio: {
            channel: 'music',
            src: '/audio/shopkeeper_hey.mp3',
        },
    },
    {
        type: 'custom_component',
        custom_component: {
            component: () => import('@/components/cutscenes/AbilityExplainer.vue'),
            trigger: { next: 'event', event: 'done' },
        }
    },
    {
        type: 'dialog',
        dialog: [
            { 
                shopkeeper: 'I have a few extras that I can give you to get started.',
                trigger: { next: 'delay', delay: 3000 }
            },
        ],
    },
    {
        type: 'custom_component',
        custom_component: {
            component: () => import('@/components/cutscenes/IntroShopWrapper.vue'),
            trigger: { next: 'event', event: 'done' },
        }
    },
    {
        type: 'dialog',
        dialog: [
            {
                shopkeeper: 'There you go! Good luck out there.',
                trigger: { next: 'confirm', text: 'Thanks!' }
            },
        ],
    },
    {
        type: 'custom_component',
        custom_component: {
            component: () => import('@/components/cutscenes/WelcomeToTheWorld.vue'),
            trigger: { next: 'event', event: 'done' },
        },
        audio: {
            channel: 'music',
            src: '/audio/Dimchevo_Oro_Macedonian_Folk_Dance.mp3',
            loop: true,
        },
    },
    {
        type: 'redirect',
        url: '/builder',
    }
  ],
};

function onFinished() {
  router.push({ path: '/builder' });
}

function onSkipped() {
  router.push({ path: '/builder' });
}
</script>