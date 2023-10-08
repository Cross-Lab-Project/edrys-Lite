<template>

  <v-expansion-panels
    variant="accordion"
    style="min-width: 400px"
  >
    <v-expansion-panel>
      <v-expansion-panel-title>

        URL

        <template v-slot:actions>
          <v-icon> mdi-link </v-icon>
        </template>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-text-field
          variant="underlined"
          label="Module URL"
          v-model="module.url"
        ></v-text-field>
      </v-expansion-panel-text>

    </v-expansion-panel>

    <Editor
      title="General settings"
      icon="mdi-script-text"
      v-model:config="module.config"
    ></Editor>

    <Editor
      title="Student settings"
      icon="mdi-account-circle-outline"
      v-model:config="module.studentConfig"
    ></Editor>

    <Editor
      title="Teacher settings"
      icon="mdi-clipboard-account-outline"
      v-model:config="module.teacherConfig"
    ></Editor>

    <Editor
      title="Station settings"
      icon="mdi-router-wireless"
      v-model:config="module.stationConfig"
    ></Editor>

    <v-expansion-panel>
      <v-expansion-panel-title>

        Show in

        <template v-slot:actions>
          <v-icon> mdi-eye </v-icon>
        </template>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-text-field
          variant="underlined"
          label="Comma separated list of rooms, or: lobby, * for all, teacher-only, station"
          v-model="module.showInCustom"
        ></v-text-field>
      </v-expansion-panel-text>

    </v-expansion-panel>

  </v-expansion-panels>

</template>

<script lang="ts">
import Editor from "./Editor.vue";

export default {
  name: "Settings-Module",

  props: {
    module: { type: Object, required: true },
  },

  data() {
    if (!this.module.showInCustom) {
      this.module.showInCustom = "*";
    }

    return {};
  },

  components: { Editor },
};
</script>