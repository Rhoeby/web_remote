var app = new Vue({
  el: '#app',
  delimiters: ['${', '}'],
  data: {
    battery_percentage: null,
    robot_name: null,
    mapImg: "/latestMap.jpg",
    mode_enum: {
        loading: 0,
        start: 1,
        run: 2,
        pause: 3,
        end: 4,
    },
    mode: -1,
    past_runs: [],
    elapsedTime: 0,
    refreshRunData: false,
    imageRefreshRate: 1000,
    locationNameInput: "",
    itemToDelete: "",
    loading_msg: "",

  },
  computed: {
    battery: function(){
        //returns the correct icon based on battery percentage
        if (this.battery_percentage > 90) return "fas fa-battery-full"
        if (this.battery_percentage > 65) return "fas fa-battery-three-quarters"
        if (this.battery_percentage > 36) return "fas fa-battery-half"
        if (this.battery_percentage > 10) return "fas fa-battery-quarter"
        return "fas fa-battery-empty"
    },
    runningTimer: function(){
      return msToTime(this.elapsedTime)
    }
  },
  created: function(){
    var self = this
    setInterval(function(){
        self.mapImg = "/latestMap.jpg?" + Date.now()
    }, self.imageRefreshRate)
  },
  methods: {
    startNav: function(){
        $.get("/startNavigation")
        this.refreshRunData = true;
        this.mode = this.mode_enum.loading
        //wait a second for data to propigate before reloading
        var self = this
        setTimeout(function(){
          updateRunInfo(self)
        }, 150)
    },
    resumeNav: function(){
      $.get("/resumeNavigation")
      this.mode = this.mode_enum.run
      updateRunInfo(this)
  },
    pauseNav: function(){
        $.get("/pauseNavigation")
        this.mode = this.mode_enum.pause
    },
    focusModal: function(){
      $('#locationName').focus()

    },
    saveNav: function(){
        var self=this
        self.refreshRunData = false;
        self.mode = self.mode_enum.loading
        self.loading_msg = "Saving Video..."

        $.get("/saveNavigation", {
            location: self.locationNameInput,
        }, function(){
          self.locationNameInput = ""
          self.elapsedTime = 0;
          self.mode = self.mode_enum.start
          self.loadData()
        })
    },
    discardNav: function(){
      var self = this
        $.get("/discardNavigation", function(){
          self.elapsedTime = 0;
          self.mode = self.mode_enum.loading
          self.loading_msg = ""
          self.loadData()
        })
    },

    loadData: function(){
        console.log("loadData")
        var self = this
        $.get("/loadData/", function(data){
            //console.log(data)
            self.battery_percentage = data.battery_percentage
            self.past_runs = data.past_runs
            self.robot_name = data.robot_name
        })
        updateRunInfo(this)
    },
    previewVideo: function(run){
      previewSource = '/static/data/'+ run.name + '/video.mp4'
      htmlCode = '<video controls class="embed-responsive-item" id="preview_video">' +
      '<source src="' + previewSource + '" >' + 
      '</video>'
      $("#player").html(htmlCode)
    },
    deleteData: function(item){
      var self = this
      $.get("/deleteData", {
        name: item,
      }).then(function(){
        self.loadData()
      })
    },

  },
  beforeMount(){
    this.loadData()
  }
})

function updateRunInfo (self){
  $.get("/navigationStatus", function(data){
    console.log(data)
    self.elapsedTime = data.elapsed_time

    if (self.mode == -1){
      console.log(data.state)
      self.mode = self.mode_enum[data.state]
    }

    if (self.mode == self.mode_enum.run){
      if(data.loading){
        self.mode = self.mode_enum.loading
      }
      else{
        self.mode = self.mode_enum.run
      }
    }

    //data finished loading
    if (self.mode == self.mode_enum.loading){
      if(!data.loading){
        self.mode = self.mode_enum[data.state]
      }
    }

    /*
    if (data.state){
      self.mode = self.mode_enum.end
    }
    */
    /* JJ - handle scenario where robot ends the run */
    if (data.state == "end"){
      self.mode = self.mode_enum.end
    }

    if (data.loading_msg)
      self.loading_msg = data.loading_msg
    
    if (self.mode == self.mode_enum.start || self.mode == self.mode_enum.start){
      self.refreshRunData = false
    }
    else {
      self.refreshRunData = true
    }
    
    setTimeout(()=>{
        if (self.refreshRunData) updateRunInfo(self)
    }, 250)
  })
}

function msToTime(s) {
  s = s* 1000
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;
  if (hrs < 10) hrs = "0" + hrs
  if (mins < 10) mins = "0" + mins
  if (secs < 10) secs = '0' + secs

  return hrs + ':' + mins + ':' + secs
}
