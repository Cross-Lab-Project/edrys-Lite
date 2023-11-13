<script lang="ts">
import Settings from "../components/Settings.vue";

import Modules from "../components/Modules.vue";

import { Database } from "../ts/Database";
import { infoHash, scrapeModule, clone } from "../ts/Utils";
import Peer from "../ts/Peer";
import Comm2 from "../ts/Comm2";

export default {
  props: ["id", "comm", "station"],

  data() {
    const room: any = null;
    const data: any = null;

    setTimeout(this.init, 100);

    let webrtcSupport = false;
    // @ts-ignore
    if (navigator.mediaDevices && navigator?.mediaDevices?.getUserMedia) {
      // WebRTC is supported
      webrtcSupport = true;
    }

    return {
      state: true,
      states: {
        webrtcSupport,
        receivedConfiguration: null,
        connectedToNetwork: null,
      },

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
        this.data = clone(this.room.data);
      }
    },
    room() {
      console.warn("room-changed", this.room);
      this.client.newSetup(clone(this.room));
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

      this.room = await this.database.get(this.id);

      if (!this.client) {
        this.client = new Peer(
          this.room ? this.room : { id: this.id, data: null, timestamp: 0 }
        );

        this.database.setObservable(this.id, (config: any) => {
          console.warn("callback- Setupt", config);
          if (config) {
            self.room = config;
          }
        });
      }

      if (this.room) {
        this.data = clone(this.room.data);

        this.client.on("setup", (room: any) => {
          console.warn("callback- Setupt", room);
          setTimeout(() => {
            if (self.room.timestamp < room.timestamp && room) {
              self.database.put(room);
              self.init();
            }
          }, 1000);
        });

        this.states.receivedConfiguration = true;

        this.scrapeModules();
      } else {
        this.client.on("setup", (room: any) => {
          console.warn("callback", room);
          if (room.timestamp && room) {
            self.database.put(room);
            self.init();
          }
        });

        //this.client.join();
      }
    },

    async scrapeModules() {
      this.scrapedModules = [];
      for (let i = 0; i < this.data.modules.length; i++) {
        let module = await scrapeModule(this.data.modules[i]);
        this.scrapedModules.push(module);
      }

      const self = this;
      self.states.connectedToNetwork = true;

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
        self.states.connectedToNetwork = true;

        self.componentKey++;
      }, Math.random() * 1000 + 1000);
    },

    saveClass(config: any) {
      this.$refs.Settings.close = true;

      this.room.data = clone(config);
      this.data = clone(config);

      console.warn("saveClass", JSON.stringify(this.data, null, 2));

      this.database.update(clone(this.room));
    },

    usersInRoom(name: string): [string, string][] {
      const users: [string, "black" | "grey"][] = [];
      const userID = this.communication?.getId();

      for (const id in this.liveClassProxy.users) {
        if (this.liveClassProxy.users[id].room === name) {
          users.push([
            this.liveClassProxy.users[id].displayName,
            userID === id ? "black" : "grey",
          ]);
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
      this.data = clone(config.data);
    },
  },
  components: {
    Settings,
    Modules,
  },
};
</script>

<template>
  <v-overlay
    v-model="state"
    v-if="states.connectedToNetwork === null || states.webrtcSupport === null || states.receivedConfiguration === null"
  >
    <v-container style="width: 100vw; height: 100vh;">
      <v-row
        justify="center"
        align="center"
        style="color: white"
      >
        <v-col
          cols="12"
          sm="6"
          md="4"
          justify="center"
          align="center"
        >
          <v-progress-circular
            indeterminate
            :size="88"
            :width="7"
            justify="center"
            align="center"
          ></v-progress-circular>

          <div>
            WebRTC-support

            <v-btn
              class="ma-5"
              size="x-small"
              color="success"
              icon="mdi-check"
              v-if="states.webrtcSupport === true"
            ></v-btn>

            <v-btn
              class="ma-5"
              size="x-small"
              color="error"
              icon="mdi-close"
              v-if="states.webrtcSupport === false"
            ></v-btn>

          </div>

          <div>
            Configuration loaded

            <v-btn
              class="ma-5"
              size="x-small"
              color="success"
              icon="mdi-check"
              v-if="states.receivedConfiguration === true"
            ></v-btn>

            <v-btn
              class="ma-5"
              size="x-small"
              color="error"
              icon="mdi-close"
              v-if="states.receivedConfiguration === false"
            ></v-btn>

          </div>

          <div>
            Connected to peer 2 peer network

            <v-btn
              class="ma-5"
              size="x-small"
              color="success"
              icon="mdi-check"
              v-if="states.connectedToNetwork === true"
            ></v-btn>

            <v-btn
              class="ma-5"
              size="x-small"
              color="error"
              icon="mdi-close"
              v-if="states.connectedToNetwork === false"
            ></v-btn>

          </div>
        </v-col>
      </v-row>
    </v-container>

  </v-overlay>
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
              href="./"
              data-link="true"
              style="color: white; text-decoration: none;"
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
                v-if="!isStation && room?.data?.createdBy === communication?.getId()"
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
            v-for="([user, color], j) in usersInRoom(name)"
            :key="j"
            :title="user"
            :style="'min-height: 1.25rem; color: ' + color"
          />

        </v-list>

        <template v-slot:append>
          <div class="pa-2">
            <v-btn
              depressed
              block
              class="mb-2"
              @click="addRoom"
              v-if="!isStation && room?.data?.createdBy === communication?.getId()"
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
            (room.data.createdBy === communication?.getId()
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
