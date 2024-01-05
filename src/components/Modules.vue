<script lang="ts">
import Module from "./Module.vue";
import isotope from "isotope-layout"

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
      iso: null,
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
	  let colWidth = function () {
      let container = document.getElementsByClassName('grid')[0];
			let w = container?.getBoundingClientRect().width || window.innerWidth 
			let	columnNum = 1
			let	columnWidth = 0

			if (w > 1200) {
				columnNum  = 5;
			} else if (w > 900) {
				columnNum  = 4;
			} else if (w > 600) {
				columnNum  = 3;
			} else if (w > 300) {
				columnNum  = 2;
			}
			
      columnWidth = Math.floor(w/columnNum);

			Array.from(document.querySelectorAll('.grid-item')).forEach(function(item) {
				let multiplier_w = item.className.match(/item--w(\d)/)
				let multiplier_h = item.className.match(/item--h(\d)/)
				let width = multiplier_w ? columnWidth * multiplier_w[1] - 8 : columnWidth - 8
				//let height = multiplier_h ? columnWidth * multiplier_h[1] * 0.5 - 8 : columnWidth * 0.5 - 8

				item.style.width= width + "px"
        //item.style.height = height + "px"

        item.width= width + "px"
        //item.height = height + "px"
			});

			return columnWidth;
		}


    const self = this;
    const layout = function() {
      self.iso = new isotope( document.querySelector('.grid'), {
        itemSelector: '.grid-item',
        masonry: {
          columnWidth: colWidth()
        }
      });
    }

    
    window.addEventListener('resize', layout);
    
    setTimeout(layout, 1000);
  },

  methods: {
    size(height: string, width: string): string {
      let result = ["grid-item"];

      switch (height) {
        case "tall":
          result.push("grid-item--h3");
          break;
        case "medium":
          result.push("grid-item--h2");
          break;
      }

      switch (width) {
        case "full":
          result.push("grid-item--w4");
          break;
        case "half":
          result.push("grid-item--w2");
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
      <div v-for="(m, i) in scrapedModulesFilter" :class="size(m.height, m.width)" >
        <Module
        
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

.grid-item {
  float: left;
	width: 20%;
	height: 200px;
  position: relative;
  margin: 0 2px 4px;
  border: 1px solid #000;
}

.grid-item--w2 {
	width: 40%;
}

.grid-item--w3 {
	width: 80%;
}

.grid-item--w4 {
	width: 80%;
}

.grid-item--h2 {
	height: 400px;
}

.grid-item--h3 {
	height: 720px;
}

.isotope .isotope-item {
	-webkit-transition-duration: 0.8s;
	-moz-transition-duration: 0.8s;
	transition-duration: 0.8s;
	-webkit-transition-property: -webkit-transform, opacity;
	-moz-transition-property: -moz-transform, opacity;
	transition-property: transform, opacity;
}

.grid {
  margin-right: 0.5rem;
}
</style>
