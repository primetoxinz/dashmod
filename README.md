# Dashmod.js
A Modular Javascript library for easily creating Driver Station Dashboards for [FIRST Robotics Competition (FRC)](http://firstinspires.org/robotics/frc).
A full implementation of this library can be found at [FRCDashboard](https://github.com/NorviewFIRSTRobotics/FRCDashboard).

## The Structure

Dashmod has two basic structures: Modules and Entries.

### Modules

The Module is a simple object that contains a list of Entries as well as an HTML Container, by default ( `<div></div>`) in which each Entry will be loaded. In the JSON file a Module is denoted as simply an array of Entry structures, like so:

```
    "<NAME>": [
      entries go here...
    ]
```

The `<NAME>` value is used to populate a [Header Entry](###Header), which can be found below By Default this list of Entries is converted into a single DOM Object which is put into an unordered list ( `<ul></ul>`) inside the Module's HTML Container.

### Entries

The basic Entry class only contains an object called data, which is parsed from the JSON File. The data field can contain any object of which will be interpreted by child classes of Entry which implement the methods.

`Entry.data` has a few required or prefered values which must be included, listed as follows

```
    key: "/SmartDashboard/myKey" //the NetworkTables key for the entry, denoted "/<Table Name>/<Key Value>"
    id: "myId" //the HTML Id of the element that will be created
    prefice: "myText" //A text value that will precede the information from NetworkTables
    format: { } //an differing object passed to Entry implementations to change based on states.
```

Entry has the `init(element)` function, this function takes in a JQuery selector element such as `$("#myEntry")` and will populate that position in the Module list.

Additionally Entry has an `update(value)` function which is called very time NetworkTables has a value change which equals `Entry.data.key`

There are a few supplied implementations of Entry for easily creating your own dashboard in module.json.

- Header<br>
  This Entry is used to Override the default Header Entry generated by every Module.

  ```
      {
        "title": "My Title",
        "color": "#FF0000" //Controls the background-color of the <h3> element
      }
  ```

- Camera<br>
  This Entry is used to add an multiple image sources for the use of MJPEG streams or other webcam services. Note: to change between src urls Shift-Click the element

  ```
    {
      "type": "camera",
      "data": {
        "id": "camera",
        "srcs": [
          "roborio-<TEAM-NUMBER>-frc.local:5800/?action=stream",
        ]
      }
    }
  ```

- Selector<br>
  This Entry is used to add a combo drop down box with multiple options.

  ```
     {
       "type": "selector",
       "data": {
         "prefice": "Autonomous",
         "key": "/SmartDashboard/autonomous", //NetworkTable key
         "id": "autonomous",
         "choices": ["left", "center", "right"] //list of choices in the selector
       }
     }
  ```

- Graph<br>
  This Entry allows adding a real-time data graph through the used of [SmoothieChart](http://smoothiecharts.org/).

  ```
  {
    "type": "graph",
    "data": {
      "prefice": "Voltage",
      "key": "/SmartDashboard/voltage",
      "id": "voltage",
      "format": {
        //format simply takes a json version of the SmoothieChart style object, which can be found on their site
      }
    }
  },
  ```

- NumberValue<br>
  This Entry allows displaying a number from the NetworkTable which can be formatted to change color based on a range of values.

  ```
  {
    "type": "numbervalue",
    "data": {
      "prefice": "Robot Time",
      "key": "/SmartDashboard/robotTime",
      "id": "robotTime",
      "formats": {
        //color format, name the object for convience

        "low": {
          //predicate is the range which the color will be applied, in this case if between 0 and 100 inclusive
          "predicate": {
            "min": 0,
            "max": 100
          },
          "color": "#0000FF"
        }
      }
    }
  }
  ```

- StringValue<br>
  This Entry allows displaying a string value from the NetworkTable.

  ```
  {
    "type": "stringvalue",
    "data": {
      "prefice": "Robot Phase",
      "key": "/SmartDashboard/robotPhase",
      "id": "robotPhase"
    }
  }
  ```

- Create Your Own
It is simple to create your own Entry type and add it directly to FRCDashboard.
//TODO

```
//my-new-module.js
import $ from "jquery"
import { Entry, Module }  from 'dashmod'
class TestEntry extends Entry {
  init() {
    super.init($("<span>\t" + this.data.prefice + " : </span><span id=" + this.data.id + "></span>"));
  }

  update(value) {
    $("#" + this.data.id).html(value);
  }
}


Module.registerEntryType(TestEntry);
//module.json
{
  "type": "testentry",
  "data": {
    "prefice": "Robot Phase",
    "key": "/SmartDashboard/robotPhase",
    "id": "robotPhase"
  }
}

```
