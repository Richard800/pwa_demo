// import * as THREE from 'https://cdn.skypack.dev/three@0.130.0';

//import helper functions from Kalidokit
const clamp = Kalidokit.Utils.remap;
const lerp = Kalidokit.Vector.lerp;

// VRM object
let currentVrm = null;

// Whether mediapipe ready
let loading_block = document.querySelector(".loading");
var started = false;
function show_loading() {
    //console.log(started);
    if (started == false) {
        loading_block.style.display = 'none';
    } else {
        loading_block.style.display = 'block';
    }
}
show_loading()

// renderer
const renderer = new THREE.WebGLRenderer({
    alpha: true,
});
renderer.setSize(
    document.querySelector('#model').clientWidth,
    (document.querySelector('#model').clientWidth / 16) * 9
);
renderer.setPixelRatio(window.devicePixelRatio);
document.querySelector('#model').appendChild(renderer.domElement);

window.addEventListener(
    "resize",
    function () {
        orbitCamera.aspect = 16 / 9;
        orbitCamera.updateProjectionMatrix();
        renderer.setSize(
            document.querySelector("#model").clientWidth,
            (document.querySelector("#model").clientWidth / 16) * 9
        );
    },
    false
);

// camera
const orbitCamera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 1000);
orbitCamera.position.set(0.0, 1.4, 0.7);

// controls
const orbitControls = new THREE.OrbitControls(orbitCamera, renderer.domElement);
orbitControls.screenSpacePanning = true;
orbitControls.target.set(0.0, 1.4, 0.0);
orbitControls.update();

// scene
const scene = new THREE.Scene();

// Main Render Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    if (currentVrm) {
        currentVrm.update(clock.getDelta());
    }
    renderer.render(scene, orbitCamera);
}
animate();

//var builtInModels = require("./models/models.json");
const cimda_vrm = '{"name": "Ashtra", "path": "./models/test.vrm", "type": "vrm", "isBuildIn": true, "picBg": "../models/img/Ashtra.png", "accessories": {"Shoes": "Bodybaked_4", "Coats": "Bodybaked_5"}}';//'{"name": "Cimda_girl_vrm", "path": "./models/cimda_girl_01_retarget_06_avg.vrm", "type": "vrm", "isBuildIn": true,"picBg": "./img/cimda_girl_01.png"}';
var modelObj = JSON.parse(cimda_vrm);
var modelPath = modelObj.path;

var fileType = modelPath.substring(modelPath.lastIndexOf(".") + 1).toLowerCase();

var skeletonHelper = null;

const light = new THREE.AmbientLight(0xffffff, 0.8);
light.position.set(10.0, 10.0, -10.0).normalize();
scene.add(light);
var light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(0, 3, -2);
light2.castShadow = true;
scene.add(light2);

var initRotation = {};

// Import model from URL
var loader = null;
if (fileType == 'fbx') {
    loader = new THREE.FBXLoader();
}else{
    loader = new THREE.GLTFLoader();
}
//Import Character
loader.crossOrigin = "anonymous";
loader.load(
    modelPath,

    (gltf) => {
        var model = null;
        if (fileType == "fbx") {
            model = gltf;
            gltf.scale.set(0.01, 0.01, 0.01);
        } else {
            model = gltf.scene;
        }

        if (fileType == "vrm") {
            // calling these functions greatly improves the performance
            THREE.VRMUtils.removeUnnecessaryVertices(gltf.scene);
            THREE.VRMUtils.removeUnnecessaryJoints(gltf.scene);

            THREE.VRM.from(gltf).then((vrm) => {
                scene.add(vrm.scene);
                currentVrm = vrm;
                currentVrm.scene.rotation.y = Math.PI; // Rotate model 180deg to face camera
            });
        }
    },
    (progress) =>
        console.log(
            "Loading model...",
            100.0 * (progress.loaded / progress.total),
            "%"
        ),

    (error) => console.error(error)
);

const rigRotation = (
    name,
    rotation = { x: 0, y: 0, z: 0},
    dampener = 1,
    lerpAmount = 0.3
) => {
    if (currentVrm) {
        const Part = currentVrm.humanoid.getBoneNode(
            THREE.VRMSchema.HumanoidBoneName[name]
        );
        if (!Part) {
            return;
        }
        let euler = new THREE.Euler(
            rotation.x * dampener,
            rotation.y * dampener,
            rotation.z * dampener,
            rotation.rotationOrder || "XYZ"
        );
        let quaternion = new THREE.Quaternion().setFromEuler(euler);
        Part.quaternion.slerp(quaternion, lerpAmount);
    } else if (skeletonHelper) {
        var skname = modelObj.binding[name].name;
        if (skname == "None") {
            return;
        }
        // find bone in bones by name
        var b = skeletonHelper.bones.find((bone) => bone.name == skname);

        if (b) {
            if (!initRotation[name]) {
                initRotation[name] = {
                    x: b.rotation.x,
                    y: b.rotation.y,
                    z: b.rotation.z,
                };
            }
            var bindingFunc = modelObj.binding[name].func;
            const x = rotation.x * dampener;
            const y = rotation.y * dampener;
            const z = rotation.z * dampener;

            let euler = new THREE.Euler(
                initRotation[name].x + eval(bindingFunc.fx),
                initRotation[name].y + eval(bindingFunc.fy),
                initRotation[name].z + eval(bindingFunc.fz),
                rotation.rotationOrder || "XYZ"
            );
            let quaternion = new THREE.Quaternion().setFromEuler(euler);
            b.quaternion.slerp(quaternion, lerpAmount);
        }else{
            console.log("Cannot found bone" + name);
        }
    }
};

const rigPosition = (
    name,
    position = { x: 0, y: 0, z: 0},
    dampener = 1,
    lerpAmount = 0.3
) => {
    if (currentVrm) {
        const Part = currentVrm.humanoid.getBoneNode(
            THREE.VRMSchema.HumanoidBoneName[name]
        );
        if (!Part) {
            return;
        }
        let vector = new THREE.Vector3(
            position.x * dampener,
            position.y * dampener,
            position.z * dampener
        );
        Part.position.lerp(vector,lerpAmount);
    } else if (skeletonHelper) {
        name = modelObj.binding[name].name;
        // find bone in bones by name
        var b = skeletonHelper.bones.fine((bone) => bone.name == name);
        if (b) {
            if (fileType == "fbx") {
                dampener *= 100;
            }
            let vector = new THREE.Vector3(
                position.x * dampener,
                position.y * dampener,
                -position.z * dampener
            );
            if (fileType == "fbx") {
                vector.y -= 1.2 * dampener;
            }
            b.position.lerp(vector, lerpAmount);
        } else {
            console.log("Cannot found bone" + name);
        }
    }
};

// var positionOffset = {
//     x: 0,
//     y: 1,
//     z: -10,
// };
var hipRotationOffset = 0.2;

const animateVRM = (vrm, results) => {
    if (!vrm && !skeletonHelper) {
        return;
    }

    if (localStorage.status == 1) {
        var positionOffset = {
            x: 0,
            y: 1,
            z: -5,
        };
    } else {
        var positionOffset = {
            x: 0,
            y: 1,
            z: -15,
        };
    }

    let riggedPose, riggedLeftHand, riggedRightHand, RiggedFace;

    const faceLandmarks = results.faceLandmarks;
    const pose3DLandmarks = results.ea;
    const pose2DLandmarks = results.poseLandmarks;
    const leftHandLandmarks = results.rightHandLandmarks
    const rightHandLandmarks = results.leftHandLandmarks;

    //console.log(pose3DLandmarks);

    if (pose2DLandmarks && pose3DLandmarks) {
        riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
            runtime: "mediapipe",
            video: videoElement,
        });
    }

    //console.log(riggedPose);

    if (pose2DLandmarks && pose3DLandmarks) {
        rigRotation("Hips", {
            x: riggedPose.Hips.rotation.x,
            y: riggedPose.Hips.rotation.y,
            z: riggedPose.Hips.rotation.z + hipRotationOffset,
        }, 0.7);
        rigPosition(
            "Hips",
            {
                x: riggedPose.Hips.position.x*5 + positionOffset.x,
                y: riggedPose.Hips.position.y*2 + positionOffset.y,
                z: -riggedPose.Hips.position.z*25 + positionOffset.z,
            },
            1,
            0.07
        );

        rigRotation("Chest", riggedPose.Spine, 0.25, 0.3);
        rigRotation("Spine", riggedPose.Spine, 0.45, 0.3);

        rigRotation("RightUpperArm", riggedPose.RightUpperArm);
        rigRotation("RightLowerArm", riggedPose.RightLowerArm);
        rigRotation("LeftUpperArm", riggedPose.LeftUpperArm);
        rigRotation("LeftLowerArm", riggedPose.LeftLowerArm);

        rigRotation("RightUpperLeg", riggedPose.RightUpperLeg);
        rigRotation("RightLowerLeg", riggedPose.RightLowerLeg);
        rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg);
        rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg);
    }
};

let videoElement = document.querySelector(".input_video");
let canvasElement = document.querySelector("canvas.guides");

new Vue({
    el: '#vue-mount',
    data: {
        videoSource: "camera",
        videoPath: "",
    }
})

function upload() {
    
    var input = document.getElementById("upload");
    var freader=new FileReader();
    freader.readAsDataURL(input.files[0]);
    freader.onload=function(e) {
        //var src = e.target.result;
        //src = freader.result;              
        document.querySelector(".input_video").src=freader.result;
    }
}

localStorage.status = 1;
function choose_camera() {
    localStorage.status = 1;
}
function choose_video() {
    localStorage.status = 2;
}
function start_function() {
    var elem = document.getElementById("btn");
    var x = localStorage.getItem("status");
    

    if (elem.value=="Start") {
        elem.value = "Stop"
        if (x==1) {
            //console.log('1');
            //console.log(document.querySelector(".input_video").src);
            started = true;
            show_loading();
            videoElement.style.transform='scale(-1, 1)';
            canvasElement.style.transform='scale(-1, 1)';
            navigator.mediaDevices
                .getUserMedia({
                    video: {
                        deviceId: localStorage.getItem("cameraId"),
                        width: 1280,
                        height: 720,
                    },
                })
                .then(function (stream) {
                    videoElement.srcObject = stream;
                    videoElement.play();
                    var videoFrameCallback = async () => {
                        // videoElement.pause()
                        await holistic.send({ image: videoElement});
                        videoElement.requestVideoFrameCallback(videoFrameCallback);
                        // videoElement.play()
                    };

                    videoElement.requestVideoFrameCallback(videoFrameCallback);
                });
            document.getElementById("camera_radio").disabled = true;
            document.getElementById("video_radio").disabled = true;
            document.getElementById("upload").disabled = true;
            
        }else if (x==2) {
            //console.log('2');
            //console.log(document.querySelector(".input_video").src);
            started = true;
            show_loading();
            videoElement.style.transform='scale(-1, 1, -1)';
            canvasElement.style.transform='scale(-1, 1, -1)';
            document.querySelector("#model").style.transform = "scale(-1, 1)";
            document.querySelector(".input_video").play();
            videoElement.loop = true;
            videoElement.controls = true;
            var videoFrameCallback = async () => {
                await holistic.send({ image: videoElement});
                videoElement.requestVideoFrameCallback(videoFrameCallback);
            };

            videoElement.requestVideoFrameCallback(videoFrameCallback);
            document.getElementById("camera_radio").disabled = true;
            document.getElementById("video_radio").disabled = true;
            document.getElementById("upload").disabled = true;
            
        }else {
            //console.log('nothing');
            
        }
    }else {
        //console.log('here');
        if (x==1) {
            videoElement.style.transform='scale( 1, 1)';
            canvasElement.style.transform='scale( 1, 1)';
            videoElement.pause();
            videoElement.srcObject=null;
            
            videoElement.src = "";
            document.querySelector(".input_video").src = "";
        }else {
            videoElement.pause();
            //document.querySelector(".input_video").puase();
            document.querySelector("#model").style.transform = "scale(1, 1)";
            // videoElement.src = "";
            // document.querySelector(".input_video").src = "";
        }
        elem.value = "Start"
        document.getElementById("camera_radio").disabled = false;
        document.getElementById("video_radio").disabled = false;
        document.getElementById("upload").disabled = false;
    };

    
}

const onResults = (results) => {
    //console.log(results);
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    let canvasCtx = canvasElement.getContext('2d');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                    {color: '#00FF00', lineWidth: 4});
    drawLandmarks(canvasCtx, results.poseLandmarks,
                    {color: '#FF0000', lineWidth: 2});
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION,
                    {color: '#C0C0C070', lineWidth: 1});
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS,
                    {color: '#CC0000', lineWidth: 5});
    drawLandmarks(canvasCtx, results.leftHandLandmarks,
                    {color: '#00FF00', lineWidth: 2});
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS,
                    {color: '#00CC00', lineWidth: 5});
    drawLandmarks(canvasCtx, results.rightHandLandmarks,
                    {color: '#FF0000', lineWidth: 2});
    canvasCtx.restore();
    animateVRM(currentVrm, results);
    started = false;
    show_loading();
};

const holistic = new Holistic({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}});
holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: true,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
holistic.onResults(onResults);
        