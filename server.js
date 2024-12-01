const express = require("express");
const path = require("path");
var app = express();
var server = app.listen(3000, function () {
  console.log("Listening on port 3000");
});
const fs = require("fs");
const fileUpload = require("express-fileupload");
const io = require("socket.io")(server, {
  allowEIO3: true, // false by default
});
app.use(express.static(path.join(__dirname, "")));
var userConnections = [];
io.on("connection", (socket) => {
  console.log("socket id is ", socket.id);
  socket.on("userconnect", (data) => {
    console.log("userconnent", data.displayName, data.meetingid);
    var other_users = userConnections.filter(
      (p) => p.meeting_id == data.meetingid
    );
    userConnections.push({
      connectionId: socket.id,
      user_id: data.displayName,
      meeting_id: data.meetingid,
    });

    console.log("Updated userConnections:", userConnections);  // Check if it's updated correctly

    var userCount = userConnections.length;
    console.log(userCount);
    other_users.forEach((v) => {
      socket.to(v.connectionId).emit("inform_others_about_me", {
        other_user_id: data.displayName,
        connId: socket.id,
        userNumber: userCount,
      });
    });
    socket.emit("inform_me_about_other_user", other_users);
  });

  socket.on("speech_to_text", (data) => {
    console.log("userConnections at speech_to_text:", userConnections); 
    console.log("Received text from:", socket.id, data.text);
    const sender = userConnections.find((v) => v.connectionId == socket.id);

    console.log("sender::",sender);
    // if (sender) {
    //   const meetingid = sender.meeting_id;
    //   const from = sender.user_id;
  
    //   // Get all users in the same meeting
    //   const meetingUsers = userConnections.filter(
    //     (v) => v.meeting_id == meetingid
    //   );
  
    //   console.log("Broadcasting to users in meeting:", meetingid);
    //   console.log("Meeting users:", meetingUsers);
  
    //   // Broadcast the speech text to all users in the meeting
    //   meetingUsers.forEach((v) => {
    //     console.log("Sending to:", v.connectionId);
    //     socket.to(v.connectionId).emit("broadcast_text", {
    //       user: from,
    //       text: data.text,
    //     });
    //   });
    // }
  });
  
    // Speech-to-text broadcasting
    // socket.on("speech_to_text", (data) => {
    //   var sender = userConnections.find((p) => p.connectionId == socket.id);
    //   if (sender) {
    //     var meetingid = sender.meeting_id;
    //     var from = sender.user_id;
  
    //     // Get all users in the same meeting
    //     var meetingUsers = userConnections.filter(
    //       (p) => p.meeting_id == meetingid
    //     );
  
    //     // Broadcast the speech text to all users in the meeting
    //     meetingUsers.forEach((v) => {
    //       socket.to(v.connectionId).emit("broadcast_text", {
    //         user: from,
    //         text: data.text,
    //       });
    //     });
    //   }
    // });
  
  
  socket.on("SDPProcess", (data) => {
    socket.to(data.to_connid).emit("SDPProcess", {
      message: data.message,
      from_connid: socket.id,
    });
  });
  socket.on("sendMessage", (msg) => {
    console.log(msg);
    var mUser = userConnections.find((p) => p.connectionId == socket.id);
    if (mUser) {
      var meetingid = mUser.meeting_id;
      var from = mUser.user_id;
      var list = userConnections.filter((p) => p.meeting_id == meetingid);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("showChatMessage", {
          from: from,
          message: msg,
        });
      });
    }
  });
  socket.on("fileTransferToOther", (msg) => {
    console.log(msg);
    var mUser = userConnections.find((p) => p.connectionId == socket.id);
    if (mUser) {
      var meetingid = mUser.meeting_id;
      var from = mUser.user_id;
      var list = userConnections.filter((p) => p.meeting_id == meetingid);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("showFileMessage", {
          username: msg.username,
          meetingid: msg.meetingid,
          filePath: msg.filePath,
          fileName: msg.fileName,
        });
      });
    }
  });

  socket.on("disconnect", function () {
    console.log("Disconnected");
    var disUser = userConnections.find((p) => p.connectionId == socket.id);
    if (disUser) {
      var meetingid = disUser.meeting_id;
      userConnections = userConnections.filter(
        (p) => p.connectionId != socket.id
      );
      var list = userConnections.filter((p) => p.meeting_id == meetingid);
      list.forEach((v) => {
        var userNumberAfUserLeave = userConnections.length;
        socket.to(v.connectionId).emit("inform_other_about_disconnected_user", {
          connId: socket.id,
          uNumber: userNumberAfUserLeave,
        });
      });
    }
  });

  // <!-- .....................HandRaise .................-->
  socket.on("sendHandRaise", function (data) {
    var senderID = userConnections.find((p) => p.connectionId == socket.id);
    console.log("senderID :", senderID.meeting_id);
    if (senderID.meeting_id) {
      var meetingid = senderID.meeting_id;
      // userConnections = userConnections.filter(
      //   (p) => p.connectionId != socket.id
      // );
      var list = userConnections.filter((p) => p.meeting_id == meetingid);
      list.forEach((v) => {
        var userNumberAfUserLeave = userConnections.length;
        socket.to(v.connectionId).emit("HandRaise_info_for_others", {
          connId: socket.id,
          handRaise: data,
        });
      });
    }
  });
  // <!-- .....................HandRaise .................-->
});

app.use(fileUpload());
app.post("/attachimg", function (req, res) {
  var data = req.body;
  var imageFile = req.files.zipfile;
  console.log(imageFile);
  var dir = "public/attachment/" + data.meeting_id + "/";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  imageFile.mv(
    "public/attachment/" + data.meeting_id + "/" + imageFile.name,
    function (error) {
      if (error) {
        console.log("couldn't upload the image file , error: ", error);
      } else {
        console.log("Image file successfully uploaded");
      }
    }
  );
});
