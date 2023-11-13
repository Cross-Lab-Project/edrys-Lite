<script lang="ts">
import { Database, DatabaseItem } from "../ts/Database";
import { infoHash, getPeerID, clone } from "../ts/Utils";

export default {
  data() {
    const database = new Database();
    const classrooms: DatabaseItem[] = [];

    database.setObservable("*", (rooms: any) => {
      this.classrooms = rooms;
    });

    return {
      database,
      classrooms,
      peerID: getPeerID(),
    };
  },

  methods: {
    deleteClass(id: string) {
      this.database.drop(id);
    },

    forkClass(classroom: any) {
      classroom = clone(classroom);

      console.log(classroom);
      const id = infoHash();
      classroom.data.createdBy = getPeerID();
      classroom.id = id;

      this.database.put({ id, data: classroom.data, timestamp: Date.now() });

      window.location.search = `?/classroom/${id}`;
    },

    async createClass() {
      const id = infoHash();

      const classroom = {
        id,
        createdBy: getPeerID(),
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

      this.database.put({ id, classroom, timestamp: Date.now() });

      window.location.search = `?/classroom/${id}`;
    },
  },
};
</script>

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
              color="surface-variant"
              elevation="4"
            >
              <v-img
                :src="classroom?.data?.meta?.logo || 'https://repository-images.githubusercontent.com/453979926/ab6bf9d7-a4bc-4a47-97b7-c8bc8bb4654d'"
                height="200px"
                cover
              ></v-img>
              <v-card-title>{{classroom.data?.name}}</v-card-title>
              <v-card-subtitle>

                <span v-if="classroom?.data.createdBy === peerID">You own this class</span>
                <span v-else>You're a student here</span>

              </v-card-subtitle>

              <v-card-text>
                <span v-html="classroom?.data?.meta?.description || 'No description'"></span>
              </v-card-text>

              <v-card-text>
                Timestamp: {{classroom?.timestamp}}
              </v-card-text>

              <v-card-actions>
                <v-btn
                  icon
                  title="fork"
                  @click="forkClass(classroom)"
                >
                  <v-icon>mdi-source-fork</v-icon>
                </v-btn>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn
                      color=""
                      v-bind="props"
                      icon="mdi-delete"
                    > </v-btn>
                  </template>

                  <v-list>
                    <v-list-item>
                      <v-list-item-title>
                        Are you sure?
                      </v-list-item-title>

                      <v-btn
                        color="red"
                        depressed
                        @click="deleteClass(classroom.id)"
                        class="float-right"
                        style="margin-top: 10px"
                      >
                        Yes, delete forever</v-btn>

                    </v-list-item>
                  </v-list>
                </v-menu>

                <v-spacer></v-spacer>
                <a
                  data-link="true"
                  :href="`./?/classroom/${classroom.id}`"
                  style="color: white"
                >
                  <v-btn
                    icon
                    title="open"
                  >
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
              color="surface-variant"
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