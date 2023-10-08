<template>

  <v-list lines="three">
    <draggable
      :list="config.modules"
      item-key="id"
      @end="move"
      class="list-group"
    >
      <template #item="{ element, index }">
        <v-list-item
          :key="index"
          class="list-group-item"
        >
          <template v-slot:prepend>
            <v-icon :icon="scrapedModules[index].icon || 'mdi-package'"></v-icon>
          </template>

          <v-list-item-title>
            {{ scrapedModules[index].name }}
            <v-chip size="x-small">
              {{element.showInCustom || "*"}}
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle
            v-html="scrapedModules[index].description"
            style="white-space: break-spaces"
          >
          </v-list-item-subtitle>

          <template v-slot:append>

            <v-menu :close-on-content-click="false">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-cog"
                  variant="text"
                  v-bind="props"
                ></v-btn>

              </template>

              <Module
                :id_="index"
                :module="element"
              ></Module>
            </v-menu>

            <v-btn
              icon="mdi-delete"
              variant="text"
            ></v-btn>
          </template>
        </v-list-item>
      </template>
    </draggable>
    <v-list-item>
      <template v-slot:prepend>
        <v-icon icon="mdi-link"></v-icon>
      </template>

      <v-text-field
        v-model="moduleImportUrl"
        label="Module URL"
        variant="underlined"
        required
        style="width: calc(100% - 40px)"
      ></v-text-field>

      <template v-slot:append>
        <v-btn
          @click="loadURL"
          :disabled="!validate_url(moduleImportUrl)"
        >
          <v-icon left> mdi-view-grid-plus </v-icon>
          Add
        </v-btn>
      </template>

    </v-list-item>

  </v-list>

  <v-divider class="pb-2"></v-divider>
  <v-btn
    href="https://github.com/topics/edrys-module"
    target="_blank"
  >
    <v-icon left> mdi-github </v-icon>
    Explore on GitHub
  </v-btn>
</template>
    
    
<script lang="ts">
import { scrapeModule, validateUrl } from "../../ts/Utils";
import draggable from "vuedraggable";
import Module from "./Module.vue";

export default {
  name: "Settings-Modules",

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

  data() {
    return {
      moduleImportUrl: "",
    };
  },

  methods: {
    async update() {
      this.scrapedModules = [];
      for (let i = 0; i < this.config.modules.length; i++) {
        let module = await scrapeModule(this.config.modules[i]);
        this.scrapedModules.push(module);
      }
    },

    move(event: any) {
      const element = this.scrapedModules[event.oldIndex];

      this.scrapedModules[event.oldIndex] = this.scrapedModules[event.newIndex];
      this.scrapedModules[event.newIndex] = element;

      return true;
    },

    validate_url(url: string) {
      return validateUrl(url);
    },

    async loadURL() {
      const module = {
        url: this.moduleImportUrl,
        config: "",
        studentConfig: "",
        teacherConfig: "",
        stationConfig: "",
        showInCustom: "",
        width: "full",
        height: "tall",
      };

      const scrapedModule = await scrapeModule(module);

      this.config.modules.push(module);
      this.scrapedModules.push(scrapedModule);

      this.moduleImportUrl = "";
    },
  },
  components: { Module, draggable },
};
</script>
    
    