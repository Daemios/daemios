<template>
  <v-flex class="d-flex flex-column">
    <h1 class="text-center">
      Editing "{{ edited.label }}"
    </h1>
    <h2 class="mt-6">
      Core Stats
    </h2>
    <h5 class="d-flex align-start">
      <span class="mr-2 mt-1">Type</span>
      <span class="text-h4 mr-6">
        {{ edited.prefix }}
      </span>
      <span class="mr-2 mt-1">Tier</span>
      <span class="text-h4 mr-6">
        {{ edited.tier }}
      </span>
      <span class="mr-2 mt-1">Sockets</span>
      <span class="text-h4">
        {{ edited.sockets }}
      </span>
    </h5>
    <div class="d-flex">
      <v-col cols="auto">
        <h3>Range</h3>
        <CorePoints
          title="test"
          :limit="9"
          :start="4"
        />
      </v-col>
      <v-col cols="auto">
        <h3>Shape</h3>
        <CorePoints
          title="test"
          :limit="9"
          :start="4"
        />
      </v-col>
      <v-col cols="auto">
        <h3>Type</h3>
        <CorePoints
          title="test"
          :limit="9"
          :start="4"
        />
      </v-col>
    </div>

    <div class="details">
      <h2 class="mt-6">
        Details
      </h2>
      <!-- Name -->
      <v-row>
        <v-col
          cols="12"
          md="6"
        >
          <v-text-field
            v-model="edited.label"
            label="Name"
          />
        </v-col>
      </v-row>

      <!-- Options -->
      <v-row>
        <v-col
          cols="4"
        >
          <v-select
            v-model="edited.range"
            label="Range"
            name="range"
            item-text="label"
            :item-value="'ability_range_id'"
            :items="$store.state.debug.selects.ability.range"
            persistent-hint
          />
        </v-col>
        <v-col
          cols="4"
        >
          <v-select
            v-model="edited.shape"
            label="Shape"
            item-text="label"
            item-value="ability_shape_id"
            :items="$store.state.debug.selects.ability.shape"
          />
        </v-col>
        <v-col
          cols="4"
        >
          <v-select
            v-model="edited.type"
            label="Type"
            item-text="label"
            item-value="ability_type_id"
            :items="$store.state.debug.selects.ability.type"
          />
        </v-col>
      </v-row>

    </div>

    <v-flex class="d-flex mt-auto">
      <v-btn
        class="error"
        @click="$router.go(-1)"
      >
        Cancel
      </v-btn>
      <v-btn
        class="ml-auto primary"
        @click="save()"
      >
        Done
      </v-btn>
    </v-flex>
  </v-flex>
</template>

<script>
import CorePoints from '@/components/cores/CorePoints';

export default {
  components: {
    CorePoints,
  },
  data() {
    return {
      edited: {
        label: null,
      },
    };
  },
  computed: {
    existingCore() {
      return this.$store.state.player.character.cores[this.$route.params.pathMatch];
    },
  },
  mounted() {
    this.edited = { ...this.existingCore };
  },
  methods: {
    getAbilityProp(type, source) {
      const ranges = this.$store.state.debug.db.ability.range;
      const shapes = this.$store.state.debug.db.ability.shape;
      const types = this.$store.state.debug.db.ability.type;

      switch (type) {
        case 'range':
          return (source === 'character' ? ranges[this.existingCore.range] : ranges[this.edited.range]) || 'None';
        case 'shape':
          return (source === 'character' ? shapes[this.existingCore.shape] : shapes[this.edited.shape]) || 'None';
        case 'type':
          return (source === 'character' ? types[this.existingCore.type] : types[this.edited.type]) || 'None';
        default:
          console.log('Unexpected Type given for getAbilityProp in EditCore.vue');
      }
      return null;
    },
    save() {
      this.$store.state.player.character.cores[this.$route.params.pathMatch] = { ...this.edited };
      this.$router.push('/cores');
    },
  },
};
</script>
