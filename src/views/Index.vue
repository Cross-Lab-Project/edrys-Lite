<template>
  <v-app>
    <v-app-bar
      color="surface-variant"
      title="edrys-lite"
    >

    </v-app-bar>

    <v-main class="d-flex">
      <v-container
        fluid
        class="align-start"
      >
        <v-row>
          <v-col
            cols="12"
            sm="6"
            md="4"
            lg="3"
            v-for="classroom in classrooms"
            :key="classroom.id"
          >
            <v-card
              class="item"
              color="primary"
              elevation="4"
            >
              <v-img
                :src="classroom?.data?.meta?.logo || 'https://repository-images.githubusercontent.com/453979926/ab6bf9d7-a4bc-4a47-97b7-c8bc8bb4654d'"
                height="200px"
                cover
              ></v-img>
              <v-card-title>{{classroom.data?.name}}</v-card-title>
              <v-card-subtitle>

                <span v-if="classroom.owner">You teach this class</span>
                <span v-else>You're a student here</span>

              </v-card-subtitle>

              <v-card-text v-html="classroom?.data?.meta?.description || 'No Description'">

              </v-card-text>

              <v-card-actions>
                <v-spacer></v-spacer>
                <a
                  data-link="true"
                  :href="`/?/classroom/${classroom.id}`"
                >
                  <v-btn icon>
                    <v-icon>mdi-arrow-right-bold</v-icon>
                  </v-btn>
                </a>
              </v-card-actions>

            </v-card>

          </v-col>

          <v-col
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-card
              class="item"
              color="primary"
              elevation="4"
              @click="createClass()"
              variant="elevated"
            >
              <v-card-title>Create a class</v-card-title>
              <v-card-subtitle>Start teaching now</v-card-subtitle>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn icon>
                  <v-icon icon="mdi-plus"></v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

    </v-main>
  </v-app>

</template>
  
  
<script lang="ts">
import { infoHash } from "../ts/Utils";

export default {
  data() {
    return {
      classrooms: window["edrys"].index,
    };
  },

  methods: {
    async init() {
      console.log("init");
    },

    async createClass() {
      const id = infoHash();

      const classroom = {
        id,
        createdBy: "teacher",
        dateCreated: new Date().getTime(),
        name: "My New Class",
        meta: {
          logo: "",
          description: "",
          selfAssign: false,
          defaultNumberOfRooms: 0,
        },
        members: {
          teacher: [],
          student: [],
        },
        modules: [
          {
            url: "https://edrys-org.github.io/module-reference/",
            config: "",
            studentConfig: "",
            teacherConfig: "",
            stationConfig: "",
            width: "full",
            height: "tall",
          },
        ],
      };

      window["edrys"].database.put(id, classroom, null, true, false);

      window.location.href = `?/classroom/${id}`;
    },
  },
};
</script>