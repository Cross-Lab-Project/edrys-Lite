<script lang="ts">
import Settings from "../components/Settings.vue";

import Modules from "../components/Modules.vue";

import { Database, DatabaseItem } from "../ts/Database";
import { infoHash, scrapeModule, clone, getPeerID } from "../ts/Utils";
import { onMounted } from "vue";
import Peer from "../ts/Peer";

import { copyToClipboard } from "../ts/Utils";

export default {
  props: ["id", "station"],

  data() {
    const database = new Database();

    const configuration: DatabaseItem | null = null;
    const data: any = null;
    const communication: Peer | null = null;

    //setTimeout(this.init, 100);

    let webRTCSupport = false;
    // @ts-ignore
    if (navigator.mediaDevices && navigator?.mediaDevices?.getUserMedia) {
      // WebRTC is supported
      webRTCSupport = true;
    }

    onMounted(() => {
      this.init();
    });

    return {
      state: true,
      states: {
        webRTCSupport,
        receivedConfiguration: null,
        connectedToNetwork: null,
      },

      database,
      configuration,
      data,

      communication,
      peerID: null,
      isOwner: false,

      showSideMenu: true,
      showSettings: false,

      scrapedModules: [],

      liveClassProxy: null,

      isStation: this.station,

      stationName: this.station ? infoHash(6) : "",

      componentKey: 0,
    };
  },
  watch: {
    showSettings() {
      if (!this.showSettings) {
        this.data = clone(this.configuration.data);
      }
    },
  },

  methods: {
    copyPeerID() {
      copyToClipboard(this.peerID);
    },
    async init() {
      this.configuration = await this.database.get(this.id);

      this.communication = new Peer(
        this.configuration
          ? this.configuration
          : { id: this.id, data: null, timestamp: 0 },
        this.stationName
      );

      this.peerID = this.communication.getPeerID();

      const self = this;

      this.database.setObservable(this.id, (config: DatabaseItem) => {
        if (config) {
          self.configuration = config;
          self.communication?.newSetup(config);
        }
      });

      if (this.configuration) {
        this.data = clone(this.configuration.data);
        this.isOwner =
          this.configuration.data.createdBy === this.peerID ||
          this.getRole() === "teacher";
        this.scrapeModules();
      }

      this.communication.on("setup", (configuration: DatabaseItem) => {
        if (configuration.timestamp && configuration) {
          self.database.put(configuration);
          self.init();
        }
      });
    },

    getRooms() {
      if (!this.liveClassProxy) return;

      const sortedKeys = Object.keys(this.liveClassProxy.rooms).sort();

      const rooms = {};
      sortedKeys.forEach((key) => {
        rooms[key] = this.liveClassProxy.rooms[key];
      });

      return rooms;
    },

    getRole() {
      if (this.isStation) {
        return "station";
      }

      if (this.isOwner) {
        return "teacher";
      }

      return "student";
    },

    async scrapeModules() {
      this.states.receivedConfiguration = true;

      this.scrapedModules = [];
      for (let i = 0; i < this.data.modules.length; i++) {
        let module = await scrapeModule(this.data.modules[i]);
        this.scrapedModules.push(module);
      }

      const self = this;

      this.communication.on("room", (config: any) => {
        self.liveClassProxy = config;
      });

      self.liveClassProxy = this.communication.join();

      this.communication.on("connected", (state: boolean) => {
        self.states.connectedToNetwork = state;
      });

      this.componentKey++;

      /*
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
      */
    },

    saveClass(configuration: any) {
      this.$refs.Settings.close = true;

      this.configuration.data = clone(configuration);
      this.data = clone(configuration);

      this.database.update(clone(this.configuration));

      this.scrapeModules();
    },

    usersInRoom(name: string): [string, string][] {
      const users: [string, "black" | "grey"][] = [];

      for (const id in this.liveClassProxy.users) {
        if (this.liveClassProxy.users[id].room === name) {
          const displayName = this.liveClassProxy.users[id].displayName;
          users.push([
            displayName.startsWith("Station ") ? displayName : displayName.slice(6),
            this.peerID === id ? "black" : "grey",
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
      this.database.drop(this.configuration.id);
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
    v-if="
      states.connectedToNetwork === null ||
      states.webRTCSupport === null ||
      states.receivedConfiguration === null
    "
    style="background-color: rgba(0, 0, 0, 0.6); z-index: 1000"
  >
    <v-container>
      <v-row
        justify="center"
        align="center"
        style="color: white; width: 100vw; height: 70vh"
      >
        <v-col cols="12" sm="12" md="4" justify="center" align="center">
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
              v-if="states.webRTCSupport === true"
            ></v-btn>

            <v-btn
              class="ma-5"
              size="x-small"
              color="error"
              icon="mdi-close"
              v-if="states.webRTCSupport === false"
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
            style="color: white; text-decoration: none"
            title="Back to index-page"
          >
            <a href="./" style="color: white; text-decoration: none">edrys-lite</a>
          </v-app-bar-title>
        </template>

        <template v-slot:append>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon="mdi-dots-vertical"> </v-btn>
            </template>

            <v-list>
              <v-list-item>
                <v-list-item-title> User ID: </v-list-item-title>
                <v-list-item-subtitle>
                  {{ peerID }}
                  <v-btn
                    icon="mdi-content-copy"
                    size="small"
                    variant="flat"
                    @click="copyPeerID()"
                  >
                  </v-btn>
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <v-list-item-title> User Role: </v-list-item-title>
                <v-list-item-subtitle>
                  {{ getRole() }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-app-bar>

      <v-navigation-drawer temporary v-model="showSideMenu">
        <v-overlay v-model="showSideMenu" style="width: 275px" v-if="isStation">
          <v-card
            tile
            width="100%"
            class="text-center"
            style="margin-top: calc(50vh - 100px)"
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
              <v-btn :href="'/?/classroom/' + id">
                <v-icon left>mdi-export-variant</v-icon>

                Exit Station mode
              </v-btn>
            </v-card-text>
          </v-card>
        </v-overlay>

        <v-list density="compact" nav>
          <v-list-item>
            <v-list-item-title>
              {{ configuration?.data?.name || "" }}
            </v-list-item-title>

            <v-list-item-subtitle>
              online users {{ Object.keys(liveClassProxy?.users || {}).length }}
            </v-list-item-subtitle>

            <template v-slot:append>
              <v-btn
                color="grey"
                icon="mdi-cog"
                @click="showSettings = !showSettings"
                variant="text"
                v-if="!isStation && isOwner"
              ></v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-divider></v-divider>

        <v-list nav v-for="(room, name, i) in getRooms()" :key="i" density="compact">
          <v-list-item
            :prepend-icon="name === 'Lobby' ? 'mdi-account-group' : 'mdi-forum'"
            :title="name"
            style="
              background-color: lightgray;
              padding-top: 0px;
              padding-bottom: 0px;
              min-height: 2rem;
            "
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
              v-if="!isStation && isOwner"
            >
              <v-icon left>mdi-forum</v-icon>
              New room
            </v-btn>
          </div>
        </template>
      </v-navigation-drawer>
      <v-main style="overflow-y: scroll">
        <v-col>
          <Modules
            :role="getRole()"
            :username_="peerID"
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
        v-if="data"
        :config="data"
        :scrapedModules="scrapedModules"
        @saveClass="saveClass"
        @deleteClass="deleteClass"
        @updateClass="updateClass"
      ></Settings>
    </v-dialog>
  </v-app>
</template>
