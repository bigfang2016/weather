const URLHEAD = 'http://api.openweathermap.org/data/2.5/';
var app = new Vue({
  el: '#app',
  data: {
      message: '',
      bool: '',
      current_data: {
        name: '',
        icon: '',
        temperature: '',
        time: '',
        wind_state: '',
        wind_speed: '',
        wind_direction: '',
        wind_deg: '',
        weather: '',
        pressure: '',
        humidity: '',
        sunrise: '',
        sunset: '',
        geoCoords: ''
      },

      forecasts_data:[
        {
          clouds: ''
        }
      ],

      hourlyForcasts: [{
        date: '',
        isToday: false,
        hourlyWeathers: [{
          dt: '',
          icon: '',
          temperature: '',
          weather: '',
          temperature_min: '',
          temperature_max: '',
          wind_speed: '',
          clouds: '',
          pressure: ''
        }]
      }]
  },
  mounted: function () {
    this.getUrl('weather')
    this.getUrl('forecast/daily')
    this.getUrl('forecast')
  },
  methods: {
    getUrl: function(weatherDay){
      var that = this;
      var cityname = that.message;
      let cityName = cityname || 'beijing';
      let weather = weatherDay;
      if(weather === 'weather'){
       this.submitCityname(cityName,that);
      }
      if(weather === 'forecast/daily'){
       this.daliy_list(cityName,that);
      }
      if(weather === 'forecast'){
       this.hours_list  (cityName,that);
      }

    },
    submitCityname: function (cityName,that) {

      axios.get(`${URLHEAD}weather?q=${cityName}&appid=ffcf51d2e901094c90de0c34e273125b&units=metric`)
        .then(function(response) {
          that.current_data.time = formatdataCurrenttime(response.data.dt);
          // console.log(response);
          that.current_data.name = response.data.name
          that.current_data.icon =  'http://openweathermap.org/img/w/' + response.data.weather[0].icon + '.png'
          that.current_data.temperature = response.data.main.temp
          that.current_data.wind_state = get_windState(response.data.wind.speed);
          that.current_data.wind_speed = response.data.wind.speed+" m/s"
          that.current_data.wind_direction = get_windDirection(response.data.wind.deg)
          that.current_data.wind_deg = "("+ response.data.wind.deg+")"
          that.current_data.weather = response.data.weather[0].description

          that.current_data.pressure = response.data.main.pressure + "hap"
          that.current_data.humidity = response.data.main.humidity + "%"
          var sunriseDate = new Date(response.data.sys.sunrise * 1000)
          that.current_data.sunrise = formatTime(sunriseDate.getHours())+ ':' + formatTime(sunriseDate.getMinutes())
          var sunsetDate = new Date(response.data.sys.sunset * 1000)
          that.current_data.sunset = formatTime(sunsetDate.getHours())+ ':' + formatTime(sunsetDate.getMinutes())
          that.current_data.geoCoords = "[" + response.data.coord.lat + "," + response.data.coord.lon + "]"
        })
        .catch(function(error) {
          console.log(error);
        });
    },
    daliy_list: function (cityName,that) {

      axios.get(`${URLHEAD}forecast/daily?q=${cityName}&mode=json&appid=ffcf51d2e901094c90de0c34e273125b&units=metric&cnt=16`)

        .then(function(response) {
          // console.log(response);
          var arr = [];
          var len = response.data.cnt
          for (var i = 0; i < len; i++) {
            var obj = {};
            var daliymessage = response.data.list[i]
            if(i == 0){
              obj.seen = true
            }
            obj.dt = formatdataDaliytime(daliymessage.dt)
            obj.icon = 'http://openweathermap.org/img/w/' + daliymessage.weather[0].icon  + '.png'
            obj.temperature_max = daliymessage.temp.max
            obj.temperature_min = daliymessage.temp.min
            obj.weather = daliymessage.weather[0].description
            obj.wind_speed = daliymessage.speed
            obj.clouds = daliymessage.clouds
            obj.pressure = daliymessage.pressure
            arr.push(obj);
          }
          that.forecasts_data = arr;
         })
        .catch(function(error) {
          console.log(error);
        });
    },
    hours_list: function(cityName,that) {

      axios.get(`${URLHEAD}forecast?q=${cityName}&mode=json&appid=ffcf51d2e901094c90de0c34e273125b&units=metric`)
        .then(function(response) {
          // console.log(response);
          // 清空旧数据
          that.hourlyForcasts = []

          var tempForcast = null /*临时建的空数组 等同于上面的data 的 hourlyForcasts*/
          var nowDate = new Date()

          for (var i = 0; i < response.data.cnt; i++) {
            var hoursmessage = response.data.list[i]
            var tempHourlyWeather = {
              dt : formatdataHourstime(hoursmessage.dt),
              icon : 'http://openweathermap.org/img/w/' + hoursmessage.weather[0].icon  + '.png',
              temperature : hoursmessage.main.temp,
              temperature_max : hoursmessage.main.temp_max,
              temperature_min : hoursmessage.main.temp_min,
              weather : hoursmessage.weather[0].description,
              wind_speed : hoursmessage.wind.speed,
              clouds : hoursmessage.clouds.all,
              pressure : hoursmessage.main.pressure
            }

            var tempDate = new Date(hoursmessage.dt * 1000)/*tempDate 获取38组数据的第一个 的时间戳*/
            if (i === 0 || tempForcast.date !== tempDate.toDateString()) {
              //这里的 toDateString() 只取到 Wed Jul 28 1993 而不取 Wed Jul 28 1993 14:39:07 GMT-0600 (PDT)
              /* 包含两种情况：第一条天气数据
                 或者 tempForcast 的日期和当前这一条数据不同，说明这是新一天的天气数据
                 后者需要把前一天的数据添加到 hourlyForcast */

              if(i !== 0){
                // console.log(i);
                that.hourlyForcasts.push(tempForcast)
              }

              // 初始化新一天的 tempForcast
              tempForcast = {
                date: tempDate.toDateString(),
                hourlyWeathers:[tempHourlyWeather]
              }

              // 判断是不是今天
              if (nowDate.toDateString() === tempDate.toDateString()) {
                tempForcast.isToday = true
              } else {
                tempForcast.isToday = false
              }
            }else{//这个 else 是把一天内每三小时的数据存到 tempForcast
              // 还是同一天的天气数据，只需在 tempForcast.hourlyWeathers 里追加一条数据
              tempForcast.hourlyWeathers.push(tempHourlyWeather)
            }
            // console.log(i);
            // console.log(tempForcast);
          }

          // 循环结束后最后一天的数据没有添加进去，在这里添加
          // 此处是因为 for 循环里都是将前一天的数据 push 到 data 数据里，而最后一天的数据就留在了tempForcast里
          if(tempForcast){
            that.hourlyForcasts.push(tempForcast)
          }
        })
        .catch(function(error) {
          console.log(error);
        });
    },
    changeBoolean: function(event){
      var ele = event.target.dataset.id
      // console.log(ele)
      if (ele == 'item1') {
        this.bool = true
      } else {
        this.bool = false
      }
    }
  }
});

/**********风速状态**************/
function get_windState(speed){
  var speed = speed;
  var wind_state;
  if (speed < 0.3) {
    wind_state = 'Calm';
  }
  else if ((speed < 1.5)&&(speed >= 0.3)) {
    wind_state = 'Light air';
  }
  else if ((speed < 3.3)&&(speed >= 1.6)) {
    wind_state = 'Light breeze';
  }
  else if ((speed < 5.5)&&(speed >= 3.4)) {
    wind_state = 'Gentle breeze';
  }
  else if ((speed < 7.9)&&(speed >= 5.5)) {
    wind_state = 'Moderate breeze';
  }
  else if ((speed < 10.7)&&(speed >= 8)) {
    wind_state = 'Fresh breeze';
  }
  return  wind_state;
};
/**********风向判断**************/
function  get_windDirection(degree){
    if ((degree>337.5 && degree<360)|| (degree>22.5 && degree<22.5))
    {return 'Northerly';}
    else if(degree>22.5 && degree<67.5){return 'North Easterly';}
    else if(degree>67.5 && degree<112.5){return 'Easterly';}
    else if(degree>112.5 && degree<157.5){return 'South Easterly';}
    else if(degree>157.5 && degree<202.5){return 'Southerly';}
    else if(degree>202.5 && degree<247.5){return 'South Westerly';}
    else if(degree>247.5 && degree<292.5){return 'Westerly';}
    else if(degree>292.5 && degree<337.5){return 'North Westerly';}
}
/**********修正时间格式**************/
function formatTime(date){
  return date.toString().length == 1 ?  '0'+ date.toString() :  date
};
/*********转化时间格式**************/
function formatdataCurrenttime(datadate){
  var myDate = new Date(datadate*1000);
  var year = myDate.getFullYear();
  var month = myDate.getMonth() + 1;
  var date = myDate.getDate();
  var hours = myDate.getHours();
  var minutes = myDate.getMinutes();
  var seconds = myDate.getSeconds();
  if (hours < 12) {
    return formatTime(date) + "/" + formatTime(month) + "/" + year + " " + formatTime(hours) + ":" + formatTime(minutes) + ":" + formatTime(seconds) + " AM";
  } else if(hours == 12){
    return formatTime(date) + "/" + formatTime(month) + "/" + year + " " + formatTime(hours) + ":" + formatTime(minutes) + ":" + formatTime(seconds) + " PM";
  }else{
    hours = hours - 12;
    return formatTime(date) + "/" + formatTime(month) + "/" + year + " " + formatTime(hours) + ":" + formatTime(minutes) + ":" + formatTime(seconds) + " PM";
  }

  // return formatTime(date) + "/" + formatTime(month) + "/" + year + " " + formatTime(hours) + ":" + formatTime(minutes) + ":" + formatTime(seconds)
  // return myDate.toLocaleString();
}
function formatdataDaliytime(datadate){
  var myDate = new Date(datadate*1000);
  var year = myDate.getFullYear();
  var month = myDate.getMonth() + 1;
  var date = myDate.getDate();
  var hours = myDate.getHours();
  var minutes = myDate.getMinutes();
  var seconds = myDate.getSeconds();
  var weekday = myDate.getDay();


  return formattoWeek(weekday) + " " + formatTime(date) + "  " + formattoMonth(month)
}
function formatdataHourstime(datadate){
  var myDate = new Date(datadate*1000);
  var year = myDate.getFullYear();
  var month = myDate.getMonth() + 1;
  var date = myDate.getDate();
  var hours = myDate.getHours();
  var minutes = myDate.getMinutes();
  var seconds = myDate.getSeconds();

  return formatTime(hours) + ":" + formatTime(minutes)

}
/************将数字月份转化为英文简写*****************/
function formattoMonth(num){
  var mon ;
  switch(num){
    case 1:
      mon = 'JAN';
      break;
    case 2:
      mon = 'FEB';
      break;
    case 3:
      mon = 'MAR';
      break;
    case 4:
      mon = 'APR';
      break;
    case 5:
      mon = 'MAY';
      break;
    case 6:
      mon = 'JUN';
      break;
    case 7:
      mon = 'JUL';
      break;
    case 8:
      mon = 'AUG';
      break;
    case 9:
      mon = 'SEP';
      break;
    case 10:
      mon = 'OCT';
      break;
    case 11:
      mon = 'NOV';
      break;
    case 12:
      mon = 'DEC';
      break;
  }
  return mon;
}
/************将数字月份转化为星期*****************/
function formattoWeek(num){
  var week ;
  switch(num){
    case 0:
      week = 'Sun';
      break;
    case 1:
      week = 'Mon';
      break;
    case 2:
      week = 'Tue';
      break;
    case 3:
      week = 'Wed';
      break;
    case 4:
      week = 'Thu';
      break;
    case 5:
      week = 'Fri';
      break;
    case 6:
      week = 'Sat';
      break;
  }
  return week;
}