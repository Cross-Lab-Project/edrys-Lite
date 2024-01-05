<template>
  <v-expansion-panels variant="accordion" style="min-width: 400px">
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

    <v-expansion-panel>
      <v-expansion-panel-title>
        Design

        <template v-slot:actions>
          <v-icon> mdi-pencil-ruler </v-icon>
        </template>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-row>
        <v-col cols="6">
            <v-container fluid>
                <p>Width</p>
                <v-radio-group v-model="module.width">
                    <v-radio label="Full" value="full"></v-radio>
                    <v-radio label="Half" value="half"></v-radio>
                    <v-radio label="Third" value="third"></v-radio>
                </v-radio-group>
            </v-container>
        </v-col>
        <v-col cols="6">
            <v-container fluid>
                <p>Height</p>
                <v-radio-group v-model="module.height">
                    <v-radio label="Tall" value="tall"></v-radio>
                    <v-radio label="Medium" value="medium"></v-radio>
                    <v-radio label="Short" value="short"></v-radio>
                </v-radio-group>
            </v-container>
        </v-col>
    </v-row>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <Editor
      title="General settings"
      icon="mdi-script-text"
      v-model:config="module.config"
      v-model:error="error.config"
    ></Editor>

    <Editor
      title="Student settings"
      icon="mdi-account-circle-outline"
      v-model:config="module.studentConfig"
      v-model:error="error.studentConfig"
    ></Editor>

    <Editor
      title="Teacher settings"
      icon="mdi-clipboard-account-outline"
      v-model:config="module.teacherConfig"
      v-model:error="error.teacherConfig"
    ></Editor>

    <Editor
      title="Station settings"
      icon="mdi-router-wireless"
      v-model:config="module.stationConfig"
      v-model:error="error.stationConfig"
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
    module: {
      type: Object,
      required: true,
    },
    error: {
      type: Object,
      required: true,
    },
  },

  data() {
    if (!this.module.showInCustom) {
      this.module.showInCustom = "*";
    }

    return {};
  },

  watch: {
    error: {
      handler() {
        this.$emit("update:error", this.error);
      },
      deep: true,
    },
  },

  components: { Editor },
};
</script>
