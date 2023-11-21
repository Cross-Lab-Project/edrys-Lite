<template>
  <v-alert
    outlined
    dense
    type="info"
    text="To add a new station, simply open this link on the client device: "
  >
    <v-container>
      <a :href="url" target="_blank">{{ url }}</a>
    </v-container>

    <template v-slot:append>
      <v-btn icon="mdi-content-copy" @click="copyUrl" variant="text"></v-btn>
    </template>
  </v-alert>
</template>

<script lang="ts">
import { copyUrl } from "../../ts/Utils";

export default {
  name: "Settings-Stations",

  props: {
    config: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      url: window.location.toString().replace("classroom", "station"),
    };
  },

  methods: {
    copyUrl() {
      copyUrl(this.url);
    },
  },
};
</script>
