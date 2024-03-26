'use client';
import styles from "./page.module.css";
import { useEffect, useState } from "react";
const { io } = require("socket.io-client");
import axios from "axios";

export default function Home() {
  let socket = null;
  const [socketID, setSocketID] = useState(null);
  const [logData, setLogData] = useState(null);

  useEffect(() => {
    socket = io("http://192.168.31.112:5000");

    socket.on("connect", () => {
      console.log("Connected to the server with socket ID:", socket.id);
      setSocketID(socket.id);
    });

    socket.on("file-update", (data) => {
      console.log("File Update", data);
      setLogData(prevData => [prevData, data]);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketID) {
      getFileLogs();
    }
  }, [socketID]);

  async function getFileLogs () {
    try {
      let response = await axios.get(`http://192.168.31.112:5000/log?userID=${socketID}`);
      console.log("Data", response.data);
      setLogData(response.data);
    } catch (Exception) {
      console.log(Exception);
    }
  }

  return (
    <main className={styles.main}>
      <pre>{logData}</pre>
    </main>
  );
}
