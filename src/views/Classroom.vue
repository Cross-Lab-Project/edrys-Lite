<template>
  <v-app>
    <v-layout>
      <v-app-bar color="surface-variant">
        <template v-slot:prepend>
          <v-app-bar-nav-icon @click="showSideMenu = !showSideMenu"></v-app-bar-nav-icon>
          <!-- remove underline from link -->

          <v-app-bar-title
            tag="a"
            style="color: white; text-decoration: none;"
            title="Back to index-page"
          >
            <a
              href="/"
              data-link="true"
            >edrys-lite</a>

          </v-app-bar-title>
        </template>

        <template v-slot:append>
          <v-btn icon="mdi-dots-vertical"></v-btn>
        </template>
      </v-app-bar>

      <v-navigation-drawer
        temporary
        v-model="showSideMenu"
      >
        <v-overlay
          v-model="showSideMenu"
          style="width: 275px;"
          v-if="isStation"
        >
          <v-card
            tile
            width="100%"
            class="text-center"
            style="margin-top: calc(50vh - 100px);"
          >
            <v-card-text class="white--text"> Station Mode Active </v-card-text>

            <v-divider></v-divider>

            <v-card-text>

              <v-text-field
                outlined
                v-model="stationName"
                active="false"
                label="Station Name"
                required
                disabled="true"
              ></v-text-field>

              This browser is now running as a station and ready to serve students
            </v-card-text>
            <v-divider></v-divider>
            <v-card-text>
              <v-btn :href="'/?/classroom/'+id">
                <v-icon left>mdi-export-variant</v-icon>

                Exit Station mode
              </v-btn>
            </v-card-text>
          </v-card>
        </v-overlay>

        <v-list
          density="compact"
          nav
        >
          <v-list-item>

            <v-list-item-title>
              {{ room?.data?.name || ""}}
            </v-list-item-title>

            <v-list-item-subtitle>
              online users {{ Object.keys(liveClassProxy?.users || {}).length  }}
            </v-list-item-subtitle>

            <template v-slot:append>
              <v-btn
                color="grey"
                icon="mdi-cog"
                @click="showSettings = !showSettings"
                variant="text"
                v-if="!isStation && room?.owner"
              ></v-btn>
            </template>

          </v-list-item>

        </v-list>
        <v-divider></v-divider>

        <v-list
          nav
          v-for="(room, name, i) in getRooms()"
          :key="i"
          density="compact"
        >

          <v-list-item
            :prepend-icon="name === 'Lobby' ? 'mdi-account-group' : 'mdi-forum'"
            :title="name"
            style="background-color: lightgray; padding-top: 0px; padding-bottom: 0px; min-height: 2rem;"
          >
            <template v-slot:append>
              <v-btn
                icon="mdi-arrow-right-circle"
                variant="text"
                @click="gotoRoom(name)"
              ></v-btn>
            </template>

          </v-list-item>

          <v-list-item
            v-for="(user, j) in usersInRoom(name)"
            :key="j"
            :title="user"
            style="min-height: 1.25rem;"
          />

        </v-list>

        <template v-slot:append>
          <div class="pa-2">
            <v-btn
              depressed
              block
              class="mb-2"
              @click="addRoom"
              v-if="!isStation && room?.owner"
            >
              <v-icon left>mdi-forum</v-icon>
              New room
            </v-btn>
          </div>
        </template>
      </v-navigation-drawer>
      <v-main style="overflow-y: scroll;">

        <v-col>

          <Modules
            :role="isStation ? 'station'
            :
            (room.owner
            ? 'teacher'
            : 'student'
            )"
            :username_="communication?.getId()"
            :liveClassProxy="liveClassProxy"
            :scrapedModules_="scrapedModules"
            :communication="communication"
            v-if="liveClassProxy !== null"
            :key="componentKey"
            :class_id="id"
          >

          </Modules>

        </v-col>

      </v-main>

    </v-layout>

    <v-dialog
      v-model="showSettings"
      max-width="1200px"
      width="90%"
      scrollable
      persistent
      :id="'settings' + componentKey"
    >
      <Settings
        ref="Settings"
        @close="showSettings = false"
        :config="data"
        :scrapedModules="scrapedModules"
        @saveClass="saveClass"
        @deleteClass="deleteClass"
        @updateClass="updateClass"
      ></Settings>
    </v-dialog>

  </v-app>

</template>
    
    
  <script lang="ts">
import Settings from "../components/Settings.vue";

import Modules from "../components/Modules.vue";

import Database from "../ts/Database";
import { infoHash, scrapeModule } from "../ts/Utils";
import Comm from "../ts/Comm";
import Comm2 from "../ts/Comm2";

export default {
  props: ["id", "comm", "station"],

  data() {
    const room: any = null;
    const data: any = null;

    setTimeout(this.init, 100);

    return {
      database: null,
      room,
      data,
      client: this.comm,
      communication: null,

      showSideMenu: true,
      showSettings: false,

      scrapedModules: [],

      liveClassProxy: null,

      isStation: this.station,

      stationName: this.station ? infoHash(6) : "",

      componentKey: 0,

      class_id: this.id,
    };
  },
  watch: {
    showSettings() {
      if (!this.showSettings) {
        this.data = this.copy(this.room.data);
      }
    },
  },

  methods: {
    getRooms() {
      if (!this.liveClassProxy) return;

      const sortedKeys = Object.keys(this.liveClassProxy.rooms).sort();

      const rooms = {};
      sortedKeys.forEach((key) => {
        rooms[key] = this.liveClassProxy.rooms[key];
      });

      return rooms;
    },

    async init() {
      this.database = new Database();
      const self = this;

      if (!this.client) {
        this.client = new Comm({ id: this.id, data: null, timestamp: 0 });
      }

      this.room = await this.database.get(this.id);

      if (this.room) {
        this.data = this.copy(this.room.data);

        this.client.on("update", (room: any) => {
          setTimeout(() => {
            if (self.room.timestamp < room.timestamp && room) {
              self.database.put(room.id, room.data, room.timestamp);
              self.init();
            }
          }, 1000);
        });

        this.scrapeModules();
      } else {
        this.client.on("update", (room: any) => {
          console.warn("callback", room);
          if (room.timestamp && room) {
            self.database.put(room.id, room.data, room.timestamp);
            self.init();
          }
        });

        this.client.join();
      }
    },

    async scrapeModules() {
      this.scrapedModules = [];
      for (let i = 0; i < this.data.modules.length; i++) {
        let module = await scrapeModule(this.data.modules[i]);
        this.scrapedModules.push(module);
      }

      const self = this;

      setTimeout(() => {
        self.communication = new Comm2(
          this.id,
          this.room.data.meta.defaultNumberOfRooms,
          this.stationName
        );

        self.communication.on("update", (config: any) => {
          self.liveClassProxy = config.data;
        });

        self.liveClassProxy = self.communication.getDoc();

        self.componentKey++;
      }, Math.random() * 1000 + 1000);
    },

    copy(json: any) {
      return JSON.parse(JSON.stringify(json));
    },

    saveClass(config: any) {
      this.$refs.Settings.close = true;

      this.room.data = this.copy(config);
      this.data = this.copy(config);

      console.warn("saveClass", JSON.stringify(this.data, null, 2));

      this.database.update(this.copy(this.room));

      //this.client.updateConfig(this.copy(this.room));
      //this.scrapeModules();
    },

    usersInRoom(name: string) {
      const users = [];

      for (const id in this.liveClassProxy.users) {
        if (this.liveClassProxy.users[id].room === name) {
          users.push(this.liveClassProxy.users[id].displayName);
        }
      }

      return users;
    },

    gotoRoom(name: string) {
      this.communication?.gotoRoom(name);
    },

    addRoom() {
      this.communication?.addRoom();
    },

    deleteClass() {
      this.database.drop(this.room.id);
      window.location.search = "";
    },

    updateClass(config: any) {
      this.data = this.copy(config.data);
    },
  },
  components: {
    Settings,
    Modules,
  },
};
</script>