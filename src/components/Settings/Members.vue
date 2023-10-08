<template>

  <v-alert
    outlined
    dense
    type="info"
    text="Invite your users in by sharing this link: "
  >
    <v-container>
      <a :href="url">{{ url }}</a>
    </v-container>

    <template v-slot:append>
      <v-btn
        icon="mdi-content-copy"
        @click="copyUrl"
        variant="text"
      ></v-btn>
    </template>
  </v-alert>

</template>
  
  
<script lang="ts">
import { copyUrl } from "../../ts/Utils";

export default {
  name: "Settings-Members",

  props: {
    config: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      url: window.location.toString(),
    };
  },

  methods: {
    copyUrl() {
      copyUrl(this.url);
    },
  },
};
</script>
  
  