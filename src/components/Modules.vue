<script lang="ts">
import Module from "./Module.vue";
import masonry from "masonry-layout"

export default {
  components: { Module },
  name: "Modules",
  props: [
    "role",
    "username_",
    "liveClassProxy",
    "scrapedModules_",
    "communication",
    "class_id",
  ],
  data() {
    return {
      username: this.username_,
      msnry: null,
      //scrapedModules: JSON.parse(JSON.stringify(this.scrapedModules_)),
      count: 0,
    };
  },
  computed: {
    roomName() {
      return this.liveClassProxy.users[this.username]?.room || "Station " + this.username;
    },
    modulesType() {
      return this.roomName.startsWith("Station ") ? "station" : "chat";
    },
    scrapedModulesFilter() {
      return this.scrapedModules_.filter((m) => {
        const showIn = m.showInCustom
          ? m.showInCustom.split(",").map((e) => e.trim())
          : m.shownIn;

        return (
          (showIn.includes(this.modulesType) ||
            showIn
              .map((e) => e.toLowerCase().replace(/\*/g, ".*"))
              .map((e) => new RegExp(e))
              .map((e) => this.roomName.toLowerCase().match(e) !== null)
              .includes(true) ||
            showIn == "*") &&
          !showIn.includes("teacher-only")
        );
      });
    },
  },
  created() {
    window.addEventListener("message", this.messageHandler);
    const iframes = document.getElementsByTagName("iframe");
    this.communication.on(
      "message",
      (msg: { subject: string; body: any; module_url: string; date: number }) => {
        for (let i = 0; i < iframes.length; i++) {
          iframes[i].contentWindow.postMessage(
            {
              event: "message",
              ...msg,
            },
            "*"
          );
        }
      }
      //self.scrapedModule.origin || self.iframeOrigin
    );

    
  },
  beforeDestroy() {
    window.removeEventListener("message", this.messageHandler);
    this.communication.on("message", undefined);
  },

  async mounted() {
    this.msnry = new masonry(".grid", {
      itemSelector: ".grid-item",
      columnWidth: 80,
      gutter: 16,
      percentPosition: true,
      horizontalOrder: false,
    });

    console.warn("XXXXX mounted", this.msnry);
  },

  methods: {
    height(size: string) {
      switch (size) {
        case "tall":
          return "720px";
        case "short":
          return "230px";
        default:
          return "475px";
      }
    },

    width(size: string) {


      switch (size) {
        case "full":
          return "100%";
        case "half":
          return "50%";
        default: {
          return "33%";
        }

      }
    },

    messageHandler(e) {
      switch (e.data.event) {
        case "message":
          this.sendMessage(e.data.subject, e.data.body, e.data.module);
          break;
        case "update":
          this.setToValue(this.liveClassProxy, e.data.path, e.data.value);
          break;
        case "echo":
          console.log("ECHO:", e.data);
          break;
        default:
          break;
      }
    },

    async sendMessage(subject, body, module_url) {
      if (body !== undefined) {
        const data = {
          msg: {
            from: this.username /* Email if teacher, name if station */,
            subject: subject,
            body: body,
            module: module_url,
          },
          room: this.roomName,
        };

        this.communication.broadcast({ topic: "room", data });
      }
    },
  },
};
</script>

<template>
  <div :key="role">
    <div
      class="grid"
      :v-show="liveClassProxy !== null ? true : false"
      style="width: 100%"
    >
        <Module
        class="grid-item"
        v-for="(m, i) in scrapedModulesFilter"
        :key="i"
        :username="username"
        :live-class-proxy="liveClassProxy"
        :scrapedModule="m"
        :role="role"
        :class_id="class_id"
        :style="{
            height: height(m.height),
            width: width(m.width),          
          }"
      >
      </Module>
    </div>

    <v-card v-if="!scrapedModules_.length">
      <v-card-text v-if="role == 'teacher' || role == 'station'">
        Sorry, looks like you have not loaded up any {{ modulesType }} modules. Add some
        in the class settings to get started.
      </v-card-text>
      <v-card-text v-if="role == 'student'">
        Sorry, it looks like the class creators have not added any modules yet.
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>

.grid-item {
  float: left;
  max-width: 900px;
  min-width: 360px;
  border: 3px solid #000;
  border-color: #000;
  border-radius: 0.3rem;
  margin-bottom: 16px;
}

.grid {
  margin-right: 0.5rem;
}
</style>
