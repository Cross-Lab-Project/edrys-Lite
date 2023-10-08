<template>
  <v-app>
    <v-app-bar
      color="surface-variant"
      title="Edrys-Lite"
    ></v-app-bar>

    <v-main class="d-flex">
      <v-container
        fluid
        class="align-start"
      >
        <v-row dense>
          <v-col cols="auto">

            <v-card
              class="item"
              color="primary"
              elevation="2"
              @click="createClass()"
              variant="elevated"
            >
              <v-card-title>Create a class</v-card-title>
              <v-card-subtitle>Start teaching now</v-card-subtitle>
              <v-card-actions>
                <v-btn
                  variant="text"
                  color="teal-accent-4"
                >
                  Learn More
                  <v-icon icon="mdi-domain"></v-icon>
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn icon>
                  <v-icon icon="mdi-domain"></v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <!--v-file-input
          label="File input"
          show-size
          density="compact"
          v-model="selectedFile"
        ></v-file-input>
  
        <v-btn
          right
          @click="uploadFile"
        >Read File</v-btn-->
    </v-main>
  </v-app>

</template>
    
    
  <script lang="ts">
import Database from "../ts/Database";

//import WebTorrent from "../../node_modules/webtorrent/dist/webtorrent.min.js";
import P2PT from "p2pt";
//window.WebTorrent = WebTorrent;

window["P2PT"] = P2PT;

export default {
  data() {
    this.init();
    //console.log("P2PT", new P2PT());

    return {
      database: null,
      classrooms: [],
    };
  },

  methods: {
    async init() {
      this.database = new Database();
      this.classrooms = await this.database.getAll();
    },

    createClass() {
      console.warn("NEW");
    },
    /*uploadFile() {
        console.warn("SSSSSSSSSSSSSSSSSSSSSSS", this.selectedFile[0]);
        if (!this.selectedFile || !this.selectedFile.length) {
          this.data = "No File Chosen";
          return;
        }
  
        const fileName = this.selectedFile[0].name;
        const reader = new FileReader();
  
        // Use the javascript reader object to load the contents
        // of the file in the v-model prop
  
        let client = this.client;
        reader.onloadend = (e) => {
          //this.data = reader.result;
  
          console.log("asdfafd", reader.result);
  
          const fileBlob = new Blob([reader.result], { type: "text/plain" });
  
          client = new WebTorrent();
  
          client.add(
            "magnet:?xt=urn:btih:bcbdd04a00962472c611d6d1742206c4ebf5075e&dn=Unnamed+Torrent+1695634749220&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev",
            (torrent) => {
              console.warn("torrent", torrent);
            }
          );
  
          
          client.seed(fileBlob, {}, (torrent) => {
            console.log("Client is seeding:", torrent.magnetURI);
          });
        
        };
  
        reader.readAsText(this.selectedFile[0]);
  },
      */
  },
};

/*
  magnet:?xt=urn:btih:bcbdd04a00962472c611d6d1742206c4ebf5075e&dn=Unnamed+Torrent+1695634749220&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev
  
  magnet:?xt=urn:btih:3ca711cd4188d227b3424089f157897fd821d9c8&dn=Unnamed+Torrent+1695634800989&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev
  
  */
</script>