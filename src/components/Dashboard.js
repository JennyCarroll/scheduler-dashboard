import React, { Component } from "react";
import Loading from "./Loading";
import Panel from "./Panel";
import classnames from "classnames";
import { indexOf } from "lodash";
import axios from "axios";
import {
  getTotalInterviews,
  getLeastPopularTimeSlot,
  getMostPopularDay,
  getInterviewsPerDay,
} from "helpers/selectors";

import { setInterview } from "helpers/reducers";

const data = [
  {
    id: 1,
    label: "Total Interviews",
    getValue: getTotalInterviews,
  },
  {
    id: 2,
    label: "Least Popular Time Slot",
    getValue: getLeastPopularTimeSlot,
  },
  {
    id: 3,
    label: "Most Popular Day",
    getValue: getMostPopularDay,
  },
  {
    id: 4,
    label: "Interviews Per Day",
    getValue: getInterviewsPerDay,
  },
];
// you could also do const Dashboard = class extends Component
class Dashboard extends Component {
  //if focused is null, we are in the four-panel view
  //WHY doesn't this have to be wrapped in a constructor
  state = {
    loading: true,
    focused: null,
    days: [],
    appointments: {},
    interviewers: {},
  };

  componentDidMount() {
    //convert the JSON string back to javascript values
    const focused = JSON.parse(localStorage.getItem("focused"));
    //check to see if there is a saved focus state in local storage and, if so, set it to state
    if (focused) {
      this.setState({ focused });
    }
    Promise.all([
      axios.get("/api/days"),
      axios.get("/api/appointments"),
      axios.get("/api/interviewers"),
    ]).then(([days, appointments, interviewers]) => {
      this.setState({
        loading: false,
        days: days.data,
        appointments: appointments.data,
        interviewers: interviewers.data,
      });
    });
    this.socket = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL);

    //converts the string data to JavaScript data types, if the data is an object with the correct type, we update the state
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (typeof data === "object" && data.type === "SET_INTERVIEW") {
        this.setState((previousState) =>
          //use setInterview to convert the state using id and interview values
          setInterview(previousState, data.id, data.interview)
        );
      }
    };
  }

  componentDidUpdate(previousProps, previousState) {
    //listen for changes to state and update local storage
    if (previousState.focused !== this.state.focused) {
      //convert values to JSON before writing to local storage.  This process of serialization allows us to save more complex data types in localStorage.
      localStorage.setItem("focused", JSON.stringify(this.state.focused));
    }
  }

  componentWillUnmount() {
    this.socket.close();
  }

  //instance method that sets the state (passed to onClick in Panel)
  selectPanel(id) {
    //pass to setState an object that contains only the property of the state object that will be modified
    this.setState((previousState) => ({
      focused: previousState.focused !== null ? null : id,
    }));
  }

  render() {
    //conditionally apply classes
    const dashboardClasses = classnames("dashboard", {
      "dashboard--focused": this.state.focused,
    });

    if (this.state.loading) {
      return <Loading />;
    }

    const panels =
      // filter panel data to render correct panel in focused mode or all the panels if not
      (
        this.state.focused
          ? data.filter((panel) => this.state.focused === panel.id)
          : data
      ).map((panel) => {
        return (
          <Panel
            key={panel.id}
            id={panel.id}
            label={panel.label}
            //look up the latest state each time
            value={panel.getValue(this.state)}
            //use arrow function in render to bind this
            onSelect={(event) => this.selectPanel(panel.id)}
          ></Panel>
        );
      });

    return <main className={dashboardClasses}>{panels}</main>;
  }
}

export default Dashboard;
