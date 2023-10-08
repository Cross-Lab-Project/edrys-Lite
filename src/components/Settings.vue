<template>
  <v-card>
    <v-toolbar
      dark
      flat
    >
      <v-toolbar-title>Class Settings</v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn
        icon
        @click="$emit('close')"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>

      <template v-slot:extension>
        <v-tabs
          v-model="tab"
          fixed-tabs
          center-active
          show-arrows
        >
          <v-tab active>
            <v-icon left> mdi-book-open-outline </v-icon>
            Settings
          </v-tab>
          <v-tab>
            <v-icon left> mdi-account-group </v-icon>
            Members
          </v-tab>
          <v-tab>
            <v-icon left> mdi-view-dashboard </v-icon>
            Modules
          </v-tab>
          <v-tab>
            <v-icon left> mdi-router-wireless </v-icon>
            Stations
          </v-tab>
          <v-tab>
            <v-icon left> mdi-share-variant </v-icon>
            Share
          </v-tab>
        </v-tabs>
      </template>
    </v-toolbar>
    <v-card-text style="height: 565px">
      <v-window
        v-model="tab"
        class="pt-5"
      >

        <v-window-item>
          <Main :config="config"></Main>
        </v-window-item>

        <v-window-item>
          <Members :config="config"></Members>
        </v-window-item>

        <v-window-item>
          <Modules
            :config="config"
            :scraped-modules="scrapedModules"
          ></Modules>
        </v-window-item>

        <v-window-item>
          <Stations :config="config"></Stations>
        </v-window-item>

        <v-window-item>
          <Share :config="config"></Share>
        </v-window-item>
      </v-window>

    </v-card-text>

    <v-card-actions>

      <v-badge
        overlap
        dot
        color="red"
        style="margin-top: 30px"
      >
        <v-btn
          @click="saveClass"
          color="primary"
        >
          <v-icon left> mdi-upload </v-icon>
          Save
        </v-btn>
      </v-badge>

      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            color=""
            v-bind="props"
            style="margin-top: 30px; margin-right: 10px; margin-left: 30px;"
            class="float-right"
          >
            Delete Class
          </v-btn>
        </template>

        <v-list>
          <v-list-item>
            <v-list-item-title>
              Are you sure?
            </v-list-item-title>

            <v-btn
              color="red"
              depressed
              @click="deleteClass"
              class="float-right"
              style="margin-top: 10px"
            >
              Yes, delete forever</v-btn>

          </v-list-item>
        </v-list>
      </v-menu>

    </v-card-actions>
  </v-card>
</template>


<script lang="ts">
import Main from "./Settings/Main.vue";
import Members from "./Settings/Members.vue";
import Modules from "./Settings/Modules.vue";
import Stations from "./Settings/Stations.vue";
import Share from "./Settings/Share.vue";

export default {
  name: "Settings",

  props: {
    config: {
      type: Object,
      required: true,
    },

    scrapedModules: {
      type: Object,
      required: true,
    },
  },

  emits: ["close"],

  data() {
    console.log("Classroom config", JSON.stringify(this.config, null, 2));

    return {
      tab: 2,
    };
  },

  methods: {
    updateModules() {
      console.warn("updateModules", this.scrapedModules);
    },
    saveClass() {
      this.$emit("saveClass", this.config);
    },
    deleteClass() {
      this.$emit("deleteClass");
    },
    updateClass() {
      this.$emit("updateClass", this.config);
    },
  },
  components: { Main, Members, Modules, Stations, Share },
};
</script>

