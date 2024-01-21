import React, { useEffect, useState } from "react";
import JSZip from "jszip";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Backdrop, Box, Fade, Modal } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import "./App.css";

// Here you can enter your client id
const CLIENT_ID = "f136934e6b16346975fb";

function App() {
  const [rerender, setRerender] = useState(false); // state for rerender and save token in localstorage
  const [userData, setUserData] = useState({}); // state for save user data and show on web page
  const [userRepos, setUserRepos] = useState([]); // state for save user repos and show on web page
  const [token, setToken] = useState(""); // state for save access token to show on web page
  const [open, setOpen] = useState(false); // state for handling mui modal
  const [hide, setHide] = useState(false); // state for get and show sussessful msg

  // useEffect for get access token and save in localstorage
  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const codeParam = urlParams.get("code");
    setToken(codeParam);

    if (codeParam && localStorage.getItem("accessToken") === null) {
      async function getAccessToken() {
        await fetch("http://localhost:4000/getAccessToken?code=" + codeParam, {
          method: "GET",
        })
          .then((response) => {
            return response.json();
          })
          .then((data) => {
            console.log(data);
            if (data.access_token) {
              localStorage.setItem("accessToken", data.access_token);
              setRerender(!rerender);
            }
          });
      }
      getAccessToken();
    }
  }, []);

  // async function for get user data and save to user data object
  async function getUserData() {
    await fetch("http://localhost:4000/getUserData", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
        "User-Agent": "request",
      },
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        setUserData(data);
        setHide(true);
      });
  }

  // useEffect for get user repos and add to user repos array
  useEffect(() => {
    const getRepos = async () => {
      try {
        const response = await fetch(userData.repos_url);
        const data = await response.json();
        setUserRepos(data);
      } catch (error) {
        console.error("Error fetching user repositories:", error);
      }
    };

    if (userData.repos_url) {
      getRepos();
    }
  }, [userData]);

  // function for handle user login to their github accounts
  const LoginWithGitHub = () => {
    window.location.assign(
      "https://github.com/login/oauth/authorize?client_id=" + CLIENT_ID
    );
  };

  // async function for download user repo with JSZip library
  const DownloadRepoFilesZip = async (repo) => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo.full_name}/contents`
      );
      const data = await response.json();

      const zip = new JSZip();

      const addFilesToZip = async (files, path = "") => {
        const filePromises = files.map(async (file) => {
          if (file.type === "file") {
            const fileResponse = await fetch(file.download_url);
            const fileContent = await fileResponse.text();
            zip.file(`${path}${file.name}`, fileContent);
          } else if (file.type === "dir") {
            const dirResponse = await fetch(
              `https://api.github.com/repos/${repo.full_name}/contents/${file.path}`
            );
            const dirContents = await dirResponse.json();
            await addFilesToZip(dirContents, `${path}${file.name}/`);
          }
        });

        await Promise.all(filePromises);
      };

      await addFilesToZip(data);

      const content = await zip.generateAsync({ type: "blob" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${repo.name}_contents.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(
        `Error downloading repository contents for ${repo.name}:`,
        error
      );
    }
  };

  // function for handle close mui modal
  const handleClose = () => setOpen(false);

  // mui modal styles
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 336,
    height: 235,
    bgcolor: "#0d1117",
    p: 4,
    borderRadius: "20px",
    outline: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-around",
  };

  const MaxWidth1000 = useMediaQuery("(max-width:1000px)");

  return (
    <div className="App">
      <div className="Logo_Place">
        <GitHubIcon
          style={
            MaxWidth1000
              ? { height: 100, width: 100 }
              : { height: 250, width: 250 }
          }
        />
        <h1>OAuth GitHub</h1>
      </div>
      <div className="Container">
        {localStorage.getItem("accessToken") ? (
          <div className="User_Container">
            {!hide && (
              <>
                <h1>Access token obtained successfully.</h1>
                <h3>Token: {token}</h3>
                <button className="LogOut_Button" onClick={() => setOpen(true)}>
                  Log out
                </button>
                <h3>
                  To get user data from GitHub API, click the button below.
                </h3>
                <button className="Get_User_Data_Button" onClick={getUserData}>
                  Get Data
                </button>
              </>
            )}
            {Object.keys(userData).length !== 0 ? (
              <div className="UserData_Container">
                <>
                  <div className="UserData_Section_One">
                    <div className="UserData_Section_One_1">
                      <img
                        style={{ borderRadius: "50%" }}
                        height="75px"
                        width="75px"
                        src={userData.avatar_url}
                      />
                    </div>
                    <div className="UserData_Section_One_2">
                      <div>Name: {userData.name}</div>
                      <div>Token: {token}</div>
                    </div>
                  </div>
                  <div className="User_Repo_Section">
                    <h3>Repositories:</h3>
                    {userRepos.map((item, index) => {
                      return (
                        <div className="Repo_Container" key={index}>
                          <div>
                            {index + 1} - Name : {item.name}
                          </div>
                          <div
                            onClick={() => DownloadRepoFilesZip(item)}
                            style={{ cursor: "pointer", marginTop: 5 }}
                          >
                            Tap to Downlaod
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="UserData_Section_Logout">
                    <button
                      className="LogOut_Button"
                      onClick={() => setOpen(true)}
                    >
                      Log out
                    </button>
                  </div>
                </>
              </div>
            ) : (
              <></>
            )}
          </div>
        ) : (
          <div className="Login_Container">
            <h2>User is not logged in!</h2>
            <h3>To login, click the button below.</h3>
            <button className="Login_Button" onClick={LoginWithGitHub}>
              Login with GitHub
            </button>
            <h3>
              (To login to your GitHub account, edit the App.js - Line 9 for
              CLIENT ID and server.js - Line 8,9 for CLIENT ID and CLIENT
              SECRET. Enter your account credentials and first run 'npm start'
              inside '\OAuth-GitHub' to run server and then change directory to
              'oauth-app' and run again 'npm start' to run localhost:3000.)
            </h3>
          </div>
        )}
      </div>

      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={open}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={open}>
          <Box sx={style}>
            <div className="LogOut_Modal_Top">Log Out !</div>
            <h3>Are you sure you want to log out?</h3>
            <div className="LogOut_Modal_Down">
              <button
                onClick={() => {
                  localStorage.removeItem("accessToken");
                  setRerender(!rerender);
                  setOpen(false);
                }}
                className="Yes_To_Logout"
              >
                Yes, Log out
              </button>
              <button onClick={handleClose} className="No_To_Logout">
                No, Cancel
              </button>
            </div>
          </Box>
        </Fade>
      </Modal>
    </div>
  );
}

export default App;
