<script lang="ts">
import Module from "./Module.vue";
import Muuri from "muuri";

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
      grid: null,
      //scrapedModules: JSON.parse(JSON.stringify(this.scrapedModules_)),
      count: 0,
    };
  },
  computed: {
    roomName() {
      const self = this;
      setTimeout(() => {
        self.gridUpdate();
      }, 1000);
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
    this.gridUpdate();
  },

  methods: {
    gridUpdate() {
      if (this.grid !== null) this.grid.destroy();

      this.grid = new Muuri(".grid", {
        dragEnabled: true,
        layoutOnInit: true,
        layoutDuration: 400,
        layoutEasing: "ease",
        dragSortInterval: 50,
        layout: {
          fillGaps: true,
          horizontal: false,
          alignRight: false,
          alignBottom: false,
          rounding: true,
        },
      });
    },

    size(height: string, width: string): string {
      let result = ["item"];

      switch (height) {
        case "huge":
          result.push("item--h4");
          break;
        case "tall":
          result.push("item--h3");
          break;
        case "medium":
          result.push("item--h2");
          break;
      }

      switch (width) {
        case "full":
          result.push("item--w3");
          break;
        case "half":
          result.push("item--w2");
          break;
      }

      return result.join(" ");
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
      <div
        class="item"
        v-for="(m, i) in scrapedModulesFilter"
        :class="size(m.height, m.width)"
      >
        <Module
          class="item-content"
          :key="i"
          :username="username"
          :live-class-proxy="liveClassProxy"
          :scrapedModule="m"
          :role="role"
          :class_id="class_id"
        >
        </Module>
      </div>
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
.item {
  display: block;
  position: absolute;
  width: 250px;
  height: 200px;
  margin: 5px;
  z-index: 1;
  max-width: 99%;
  border: 1px solid #888;
  border-top: 0.75rem solid #888;
  border-radius: 0.25rem;
}

.item--w2 {
  width: 510px;
}

.item--w3 {
  width: 1030;
}

.item--h2 {
  height: 410px;
}

.item--h3 {
  height: 720px;
}

.item--h4 {
  height: 830px;
}

.grid {
  position: relative;
  width: 100%;
  margin: 0 auto;
}

.item.muuri-item-dragging {
  z-index: 3;
}
.item.muuri-item-releasing {
  z-index: 2;
}
.item.muuri-item-hidden {
  z-index: 0;
}
</style>
