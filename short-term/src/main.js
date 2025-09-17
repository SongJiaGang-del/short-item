import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

// 场景变量
let scene, camera, renderer;
let astronaut, mixer, clock;
let isFirstPerson = false;
let firstPersonControls, thirdPersonControls;
let astronautVelocity = new THREE.Vector3();
let astronautSpeed = 0.03;

// 移动端相关变量
let isMobile = false;
let joystick = null;
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickPosition = { x: 0, y: 0 };
let joystickRadius = 50;

// 科普模式相关变量
let isEducationMode = false;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let planetModels = {}; // 存储行星模型引用

// 检测是否为移动设备
function detectMobile() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isMobileDevice =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return isMobileDevice || isTouchDevice;
}

// 创建星空背景
function createStars() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = 2000;
  const positions = new Float32Array(starsCount * 3);

  for (let i = 0; i < starsCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 10000;
    positions[i3 + 1] = (Math.random() - 0.5) * 10000;
    positions[i3 + 2] = (Math.random() - 0.5) * 10000;
  }

  starsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0.8,
  });

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

// 初始化场景
function init() {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a); // 更深的背景色，更符合外太阳系

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    20000 // 大幅增加远裁剪面以适应更大的太阳系
  );
  camera.position.set(0, 500, 2000); // 调整到适合观察更大太阳系的位置

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.sortObjects = true; // 启用对象排序
  document.getElementById("app").appendChild(renderer.domElement);

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0x404040, 1.2); // 增加环境光强度
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // 增加方向光强度
  directionalLight.position.set(10, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // 添加额外的光源增加亮度
  const additionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  additionalLight.position.set(-10, 8, -5);
  scene.add(additionalLight);

  // 添加点光源增加整体亮度
  const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
  pointLight.position.set(0, 10, 0);
  scene.add(pointLight);

  // 创建星空背景
  createStars();

  // 初始化时钟
  clock = new THREE.Clock();

  // 加载宇航员模型
  loadAstronaut();

  // 加载太阳系模型
  loadSolarSystem();

  // 初始化控制器
  initControls();

  // 添加窗口大小调整事件监听器
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 添加鼠标点击事件监听器（用于科普模式）
  renderer.domElement.addEventListener("click", onMouseClick);

  // 开始渲染循环
  animate();
}

// 加载宇航员模型
function loadAstronaut() {
  const loader = new GLTFLoader();

  // 显示加载提示
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.textContent = "正在加载宇航员模型...";
  document.getElementById("app").appendChild(loadingDiv);

  // 尝试多个可能的路径
  const modelPaths = [
    "./模型存放点/astronaut/scene.gltf",
    "/模型存放点/astronaut/scene.gltf",
    "./astronaut/scene.gltf",
  ];

  let currentPathIndex = 0;

  function tryLoadModel() {
    if (currentPathIndex >= modelPaths.length) {
      loadingDiv.textContent = "模型加载失败，创建备用模型";
      loadingDiv.style.color = "#ff6b6b";

      // 创建备用模型
      setTimeout(() => {
        createFallbackModel();
        if (loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
      }, 2000);
      return;
    }

    const modelPath = modelPaths[currentPathIndex];
    console.log(`尝试加载模型: ${modelPath}`);

    loader.load(
      modelPath,
      (gltf) => {
        astronaut = gltf.scene;
        astronaut.scale.set(1, 1, 1);
        astronaut.position.set(0, 50, 100); // 设置宇航员初始位置：在太阳系中心上方50单位，前方100单位
        astronaut.rotation.y = Math.PI; // 旋转180度，让面部朝向W方向（前方）
        astronaut.castShadow = true;
        astronaut.renderOrder = 0; // 设置宇航员优先渲染

        // 设置动画混合器
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(astronaut);
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
        }

        scene.add(astronaut);

        // 移除加载提示
        if (loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }

        console.log("模型加载成功!");
      },
      (progress) => {
        // 更新加载进度
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          loadingDiv.textContent = `正在加载宇航员模型... ${percent}%`;
        } else {
          loadingDiv.textContent = `正在加载宇航员模型... ${Math.round(
            progress.loaded / 1024
          )}KB`;
        }
      },
      (error) => {
        console.error(`加载模型失败 (${modelPath}):`, error);
        currentPathIndex++;
        if (currentPathIndex < modelPaths.length) {
          loadingDiv.textContent = `尝试其他路径... (${currentPathIndex + 1}/${
            modelPaths.length
          })`;
          setTimeout(tryLoadModel, 1000);
        } else {
          loadingDiv.textContent = "模型加载失败，请检查文件路径";
          loadingDiv.style.color = "#ff6b6b";
        }
      }
    );
  }

  tryLoadModel();
}

// 加载太阳系模型
function loadSolarSystem() {
  const loader = new GLTFLoader();

  // 太阳系模型变量
  let sunModel, earthModel, marsModel, venusModel, mercuryModel;
  let jupiterModel, saturnModel, uranusModel, neptuneModel;

  // 旋转组
  const earthRotationGroup = new THREE.Group();
  const marsRotationGroup = new THREE.Group();
  const venusRotationGroup = new THREE.Group();
  const mercuryRotationGroup = new THREE.Group();
  const jupiterRotationGroup = new THREE.Group();
  const saturnRotationGroup = new THREE.Group();
  const uranusRotationGroup = new THREE.Group();
  const neptuneRotationGroup = new THREE.Group();

  scene.add(earthRotationGroup);
  scene.add(marsRotationGroup);
  scene.add(venusRotationGroup);
  scene.add(mercuryRotationGroup);
  scene.add(jupiterRotationGroup);
  scene.add(saturnRotationGroup);
  scene.add(uranusRotationGroup);
  scene.add(neptuneRotationGroup);

  // 创建轨道
  function createOrbit(radius, color = 0x555555) {
    const orbit = new THREE.Mesh(
      new THREE.RingGeometry(radius, radius + 0.1, 64),
      new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
      })
    );
    orbit.rotation.x = Math.PI / 2;
    return orbit;
  }

  // 添加轨道（增大轨道半径）
  scene.add(createOrbit(30)); // 水星轨道（5倍）
  scene.add(createOrbit(50)); // 金星轨道（5倍）
  scene.add(createOrbit(75)); // 地球轨道（5倍）
  scene.add(createOrbit(125)); // 火星轨道（5倍）
  scene.add(createOrbit(350)); // 木星轨道（5倍）
  scene.add(createOrbit(600)); // 土星轨道（5倍）
  scene.add(createOrbit(900)); // 天王星轨道（5倍）
  scene.add(createOrbit(1250)); // 海王星轨道（5倍）

  // 加载太阳
  loader.load("./model/sun/scene.gltf", (gltf) => {
    sunModel = gltf.scene;
    sunModel.scale.set(1.0, 1.0, 1.0); // 增大太阳尺寸
    sunModel.position.set(0, 0, 0);
    sunModel.userData = { name: "太阳", type: "star" }; // 添加用户数据
    scene.add(sunModel);
    planetModels.sun = sunModel; // 存储引用
  });

  // 加载水星
  loader.load("./model/mercury/scene.gltf", (gltf) => {
    mercuryModel = gltf.scene;
    mercuryModel.scale.set(3, 3, 3); // 增大水星尺寸
    mercuryModel.position.set(30, 0, 0); // 更新位置到新轨道半径
    mercuryModel.userData = { name: "水星", type: "planet" }; // 添加用户数据
    mercuryRotationGroup.add(mercuryModel);
    planetModels.mercury = mercuryModel; // 存储引用
  });

  // 加载金星
  loader.load("./model/venus/scene.gltf", (gltf) => {
    venusModel = gltf.scene;
    venusModel.scale.set(6, 6, 6); // 增大金星尺寸
    venusModel.position.set(50, 0, 0); // 更新位置到新轨道半径
    venusModel.userData = { name: "金星", type: "planet" }; // 添加用户数据
    venusRotationGroup.add(venusModel);
    planetModels.venus = venusModel; // 存储引用
  });

  // 加载地球
  loader.load("./model/earth/scene.gltf", (gltf) => {
    earthModel = gltf.scene;
    earthModel.scale.set(60, 60, 60); // 增大地球尺寸
    earthModel.position.set(75, 0, 0); // 更新位置到新轨道半径
    earthModel.userData = { name: "地球", type: "planet" }; // 添加用户数据
    earthRotationGroup.add(earthModel);
    planetModels.earth = earthModel; // 存储引用
  });

  // 加载火星
  loader.load("./model/mars/scene.gltf", (gltf) => {
    marsModel = gltf.scene;
    marsModel.scale.set(9, 9, 9); // 增大火星尺寸
    marsModel.position.set(125, 0, 0); // 更新位置到新轨道半径
    marsModel.userData = { name: "火星", type: "planet" }; // 添加用户数据
    marsRotationGroup.add(marsModel);
    planetModels.mars = marsModel; // 存储引用
  });

  // 加载木星
  loader.load("./model/jupiter/scene.gltf", (gltf) => {
    jupiterModel = gltf.scene;
    jupiterModel.scale.set(15, 15, 15); // 增大木星尺寸
    jupiterModel.position.set(350, 0, 0); // 更新位置到新轨道半径
    jupiterModel.userData = { name: "木星", type: "planet" }; // 添加用户数据
    jupiterRotationGroup.add(jupiterModel);
    planetModels.jupiter = jupiterModel; // 存储引用
  });

  // 加载土星
  loader.load("./model/saturn/scene.gltf", (gltf) => {
    saturnModel = gltf.scene;
    saturnModel.scale.set(0.3, 0.3, 0.3); // 增大土星尺寸
    saturnModel.position.set(600, 0, 0); // 更新位置到新轨道半径
    saturnModel.userData = { name: "土星", type: "planet" }; // 添加用户数据
    saturnRotationGroup.add(saturnModel);
    planetModels.saturn = saturnModel; // 存储引用
  });

  // 加载天王星
  loader.load("./model/uranus/scene.gltf", (gltf) => {
    uranusModel = gltf.scene;
    uranusModel.scale.set(0.3, 0.3, 0.3); // 增大天王星尺寸
    uranusModel.position.set(900, 0, 0); // 更新位置到新轨道半径
    uranusModel.rotation.x = Math.PI / 2.05; // 98度倾斜
    uranusModel.userData = { name: "天王星", type: "planet" }; // 添加用户数据
    uranusRotationGroup.add(uranusModel);
    planetModels.uranus = uranusModel; // 存储引用
  });

  // 加载海王星
  loader.load("./model/neptune/scene.gltf", (gltf) => {
    neptuneModel = gltf.scene;
    neptuneModel.scale.set(3, 3, 3); // 增大海王星尺寸
    neptuneModel.position.set(1250, 0, 0); // 更新位置到新轨道半径
    neptuneModel.rotation.x = Math.PI / 6.3; // 28.3度倾斜
    neptuneModel.userData = { name: "海王星", type: "planet" }; // 添加用户数据
    neptuneRotationGroup.add(neptuneModel);
    planetModels.neptune = neptuneModel; // 存储引用
  });

  // 将太阳系模型变量存储到全局，供动画使用
  window.solarSystemModels = {
    sun: sunModel,
    mercury: mercuryModel,
    venus: venusModel,
    earth: earthModel,
    mars: marsModel,
    jupiter: jupiterModel,
    saturn: saturnModel,
    uranus: uranusModel,
    neptune: neptuneModel,
    rotationGroups: {
      mercury: mercuryRotationGroup,
      venus: venusRotationGroup,
      earth: earthRotationGroup,
      mars: marsRotationGroup,
      jupiter: jupiterRotationGroup,
      saturn: saturnRotationGroup,
      uranus: uranusRotationGroup,
      neptune: neptuneRotationGroup,
    },
  };
}

// 方向标识功能已移除

// 更新太阳系动画
function updateSolarSystemAnimation(delta) {
  if (!window.solarSystemModels) return;

  const models = window.solarSystemModels;

  // 太阳自转
  if (models.sun) {
    models.sun.rotation.y += 0.01;
  }

  // 水星公转和自转
  if (models.rotationGroups.mercury) {
    models.rotationGroups.mercury.rotation.y += 0.012; // 公转速度最快
  }
  if (models.mercury) {
    models.mercury.rotation.y += 0.008; // 自转速度较慢
  }

  // 金星公转和自转（金星自转非常缓慢且方向相反）
  if (models.rotationGroups.venus) {
    models.rotationGroups.venus.rotation.y += 0.007; // 公转速度比地球快
  }
  if (models.venus) {
    models.venus.rotation.y -= 0.001; // 负号表示逆向自转
  }

  // 地球公转和自转
  if (models.rotationGroups.earth) {
    models.rotationGroups.earth.rotation.y += 0.005;
  }
  if (models.earth) {
    models.earth.rotation.y += 0.02;
  }

  // 火星公转和自转（速度比地球慢）
  if (models.rotationGroups.mars) {
    models.rotationGroups.mars.rotation.y += 0.003;
  }
  if (models.mars) {
    models.mars.rotation.y += 0.018;
  }

  // 木星公转和自转（气态巨行星自转快、公转慢）
  if (models.rotationGroups.jupiter) {
    models.rotationGroups.jupiter.rotation.y += 0.001; // 公转速度很慢
  }
  if (models.jupiter) {
    models.jupiter.rotation.y += 0.04; // 自转速度非常快
  }

  // 土星公转和自转
  if (models.rotationGroups.saturn) {
    models.rotationGroups.saturn.rotation.y += 0.0007; // 公转速度比木星更慢
  }
  if (models.saturn) {
    models.saturn.rotation.y += 0.038; // 自转速度快
  }

  // 天王星公转和自转
  if (models.rotationGroups.uranus) {
    models.rotationGroups.uranus.rotation.y += 0.0004; // 公转速度更慢
  }
  if (models.uranus) {
    models.uranus.rotation.y += 0.035; // 自转速度
  }

  // 海王星公转和自转
  if (models.rotationGroups.neptune) {
    models.rotationGroups.neptune.rotation.y += 0.0001; // 公转速度最慢
  }
  if (models.neptune) {
    models.neptune.rotation.y += 0.032; // 自转速度
  }
}

// 更新宇航员移动
function updateAstronautMovement() {
  if (!astronaut || isEducationMode) return; // 科普模式下禁用宇航员移动

  // 重置速度
  astronautVelocity.set(0, 0, 0);

  // 上浮和下沉控制（太空环境）
  if (keys.up) {
    astronautVelocity.y += astronautSpeed;
  }
  if (keys.down) {
    astronautVelocity.y -= astronautSpeed;
  }

  // 移动端摇杆控制
  if (isMobile && joystickActive) {
    // 计算摇杆输入值（-1 到 1）
    const inputX = joystickPosition.x / joystickRadius;
    const inputY = -joystickPosition.y / joystickRadius; // 反转Y轴，向上为正

    if (isFirstPerson) {
      // 第一人称模式：摇杆控制前进后退和左右移动，视角只能通过触摸控制
      if (!firstPersonControls) return;

      // 获取相机的朝向
      const direction = new THREE.Vector3();
      firstPersonControls.getDirection(direction);

      // 计算前进和右侧方向（忽略Y轴，保持水平移动）
      const forward = new THREE.Vector3(
        direction.x,
        0,
        direction.z
      ).normalize();
      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize();

      // 摇杆控制移动
      astronautVelocity.add(
        forward.clone().multiplyScalar(inputY * astronautSpeed)
      );
      astronautVelocity.add(
        right.clone().multiplyScalar(inputX * astronautSpeed)
      );

      // 宇航员朝向跟随相机方向（不根据移动方向改变）
      astronaut.rotation.y = Math.atan2(direction.x, direction.z);
    } else {
      // 第三人称模式：摇杆控制移动和转向
      let angle = astronaut.rotation.y;

      // 左右摇杆控制转向
      if (Math.abs(inputX) > 0.1) {
        angle += inputX * 0.05;
      }
      astronaut.rotation.y = angle;

      // 计算前进方向
      const forward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));

      // 前后摇杆控制移动
      if (Math.abs(inputY) > 0.1) {
        astronautVelocity.add(
          forward.clone().multiplyScalar(inputY * astronautSpeed)
        );
      }
    }
  } else if (isFirstPerson) {
    // 第一人称模式：只使用W/S控制前进后退，A/D键无效，视角只能通过鼠标控制
    if (!firstPersonControls) return;

    // 获取相机的朝向
    const direction = new THREE.Vector3();
    firstPersonControls.getDirection(direction);

    // 计算前进和右侧方向（忽略Y轴，保持水平移动）
    const forward = new THREE.Vector3(direction.x, 0, direction.z).normalize();
    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    // W/S控制前后移动
    if (keys.forward) {
      astronautVelocity.add(forward.clone().multiplyScalar(astronautSpeed));
    }
    if (keys.backward) {
      astronautVelocity.add(forward.clone().multiplyScalar(-astronautSpeed));
    }

    // A/D控制左右移动（侧移）
    if (keys.left) {
      astronautVelocity.add(right.clone().multiplyScalar(-astronautSpeed));
    }
    if (keys.right) {
      astronautVelocity.add(right.clone().multiplyScalar(astronautSpeed));
    }

    // 宇航员朝向跟随相机方向（不根据移动方向改变）
    astronaut.rotation.y = Math.atan2(direction.x, direction.z);
  } else {
    // 第三人称模式：A/D转向，W/S前后移动
    let angle = astronaut.rotation.y;

    // A/D控制转向
    if (keys.left) {
      angle += 0.02;
    }
    if (keys.right) {
      angle -= 0.02;
    }
    astronaut.rotation.y = angle;

    // 计算前进方向
    const forward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));

    // W/S控制前后移动
    if (keys.forward) {
      astronautVelocity.add(forward.clone().multiplyScalar(astronautSpeed));
    }
    if (keys.backward) {
      astronautVelocity.add(forward.clone().multiplyScalar(-astronautSpeed));
    }
  }

  // 应用移动
  astronaut.position.add(astronautVelocity);

  // 限制移动范围（扩大到1500x1500区域，适应更大的太阳系规模）
  astronaut.position.x = Math.max(-1500, Math.min(1500, astronaut.position.x));
  astronaut.position.z = Math.max(-1500, Math.min(1500, astronaut.position.z));
}

// 创建备用模型
function createFallbackModel() {
  console.log("创建备用模型...");

  // 创建宇航员形状的几何体组合
  const group = new THREE.Group();

  // 身体（圆柱体）
  const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.6, 1.5, 8);
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }); // 更明亮的白色
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  // 头部（球体）
  const headGeometry = new THREE.SphereGeometry(0.4, 8, 6);
  const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffe4c4 }); // 更明亮的肤色
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.8;
  head.castShadow = true;
  group.add(head);

  // 手臂（圆柱体）
  const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 6);
  const armMaterial = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }); // 更明亮的白色

  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.8, 1, 0);
  leftArm.rotation.z = Math.PI / 4;
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.8, 1, 0);
  rightArm.rotation.z = -Math.PI / 4;
  rightArm.castShadow = true;
  group.add(rightArm);

  // 腿部（圆柱体）
  const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 6);
  const legMaterial = new THREE.MeshLambertMaterial({ color: 0x0000aa }); // 更明亮的蓝色

  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.3, -0.5, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.3, -0.5, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // 头盔（半球体）
  const helmetGeometry = new THREE.SphereGeometry(
    0.45,
    8,
    6,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  );
  const helmetMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4, // 稍微增加透明度
  });
  const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
  helmet.position.y = 1.8;
  helmet.castShadow = true;
  group.add(helmet);

  astronaut = group;
  astronaut.position.set(0, 50, 100); // 设置备用宇航员初始位置：在太阳系中心上方50单位，前方100单位
  astronaut.rotation.y = Math.PI; // 旋转180度，让面部朝向W方向（前方）
  astronaut.renderOrder = 0; // 设置备用模型优先渲染
  scene.add(astronaut);

  console.log("备用模型创建完成!");
}

// 初始化控制器
function initControls() {
  try {
    // 第三人称控制器
    thirdPersonControls = new OrbitControls(camera, renderer.domElement);
    thirdPersonControls.enableDamping = true;
    thirdPersonControls.dampingFactor = 0.05;
    thirdPersonControls.screenSpacePanning = false;
    thirdPersonControls.minDistance = 50;
    thirdPersonControls.maxDistance = 5000; // 大幅增加最大距离以适应更大的太阳系
    thirdPersonControls.maxPolarAngle = Math.PI / 2;

    // 第一人称控制器
    firstPersonControls = new PointerLockControls(camera, renderer.domElement);

    // 设置初始控制器
    setThirdPersonView();
  } catch (error) {
    console.error("初始化控制器时出错:", error);
  }
}

// 设置第三人称视角
function setThirdPersonView() {
  isFirstPerson = false;

  // 断开第一人称控制器并解锁指针
  if (firstPersonControls) {
    firstPersonControls.disconnect();
    unlockPointer();
  }

  // 移除点击事件监听器
  renderer.domElement.removeEventListener("click", lockPointer);

  // 隐藏第一人称提示
  const hint = document.getElementById("firstPersonHint");
  if (hint) {
    hint.style.display = "none";
  }

  thirdPersonControls.enabled = true;

  if (astronaut) {
    // 相对于宇航员的位置 - 适合观察更大太阳系的位置
    const astronautPosition = new THREE.Vector3();
    astronaut.getWorldPosition(astronautPosition);

    // 只在切换视角时设置初始位置，之后让用户控制
    camera.position.set(
      astronautPosition.x, // 保持X位置
      astronautPosition.y + 200, // 上方更高
      astronautPosition.z + 500 // 后方更远
    );
    thirdPersonControls.target.copy(astronautPosition);
    thirdPersonControls.target.y += 1; // 看向宇航员头部位置
  } else {
    // 如果没有宇航员，使用适合观察更大太阳系的位置
    camera.position.set(0, 500, 2000);
    thirdPersonControls.target.set(0, 0, 0);
  }

  thirdPersonControls.update();
}

// 设置第一人称视角
function setFirstPersonView() {
  isFirstPerson = true;
  thirdPersonControls.enabled = false;

  // 确保第一人称控制器正确连接
  if (firstPersonControls) {
    firstPersonControls.disconnect();
  }
  firstPersonControls.connect(renderer.domElement);

  if (astronaut) {
    // 获取宇航员世界坐标
    const astronautPosition = new THREE.Vector3();
    astronaut.getWorldPosition(astronautPosition);

    // 计算宇航员面部朝向的前方向量
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), astronaut.rotation.y);

    // 设置相机位置：宇航员位置 + 眼部高度 + 向前偏移
    const eyeHeight = 1.6;
    const forwardOffset = 0.5; // 向前偏移0.5米，避免在模型内部

    const eyePosition = new THREE.Vector3(
      astronautPosition.x + forward.x * forwardOffset,
      astronautPosition.y + eyeHeight,
      astronautPosition.z + forward.z * forwardOffset
    );

    camera.position.copy(eyePosition);
    // 设置初始朝向与宇航员一致
    camera.rotation.set(0, astronaut.rotation.y, 0);
  } else {
    // 如果没有宇航员，使用默认位置
    camera.position.set(0, 1.6, 0.5);
    camera.rotation.set(0, 0, 0);
  }

  // 添加点击事件来锁定指针
  renderer.domElement.addEventListener("click", lockPointer);

  // 显示第一人称提示
  const hint = document.getElementById("firstPersonHint");
  if (hint) {
    hint.style.display = "block";
  }
}

// 更新第一人称相机位置（跟随宇航员）
function updateFirstPersonCamera() {
  if (isFirstPerson && astronaut) {
    // 获取宇航员世界坐标
    const astronautPosition = new THREE.Vector3();
    astronaut.getWorldPosition(astronautPosition);

    // 计算宇航员面部朝向的前方向量
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), astronaut.rotation.y);

    // 设置相机位置：宇航员位置 + 眼部高度 + 向前偏移
    const eyeHeight = 1.6;
    const forwardOffset = 0.5; // 向前偏移0.5米，避免在模型内部

    const targetPosition = new THREE.Vector3(
      astronautPosition.x + forward.x * forwardOffset,
      astronautPosition.y + eyeHeight,
      astronautPosition.z + forward.z * forwardOffset
    );

    // 平滑跟随宇航员移动
    camera.position.lerp(targetPosition, 0.1);

    // 确保第一人称控制器也跟随
    if (firstPersonControls && firstPersonControls.object) {
      firstPersonControls.object.position.copy(camera.position);

      // 限制第一人称视角的角度范围
      limitFirstPersonRotation();
    }
  }
}

// 限制第一人称视角的旋转角度
function limitFirstPersonRotation() {
  if (!firstPersonControls || !firstPersonControls.object) return;

  // PointerLockControls 的结构：
  // object = yawObject (水平旋转)
  // object.children[0] = pitchObject (垂直旋转)
  const yawObject = firstPersonControls.object;
  const pitchObject = yawObject.children[0];

  if (yawObject) {
    // 限制水平旋转范围：-180度到180度（完全自由）
    // 实际上不需要限制水平旋转，因为宇航员可以转向任何方向
  }

  if (pitchObject) {
    // 限制垂直旋转范围：-60度到60度
    const minPitch = -Math.PI / 3; // -60度
    const maxPitch = Math.PI / 3; // +60度

    if (pitchObject.rotation.x < minPitch) {
      pitchObject.rotation.x = minPitch;
    }
    if (pitchObject.rotation.x > maxPitch) {
      pitchObject.rotation.x = maxPitch;
    }
  }
}

// 更新第三人称相机目标（跟随宇航员）
function updateThirdPersonTarget() {
  if (!isFirstPerson && astronaut && thirdPersonControls) {
    const astronautPosition = new THREE.Vector3();
    astronaut.getWorldPosition(astronautPosition);

    // 只更新目标点跟随宇航员移动，不强制调整相机位置
    const targetPosition = astronautPosition.clone();
    targetPosition.y += 1; // 看向宇航员头部位置

    // 使用线性插值实现平滑跟随
    thirdPersonControls.target.lerp(targetPosition, 0.1);

    // 移除自动相机位置调整，让用户完全控制相机位置
    // 这样避免了与滚轮和鼠标控制的冲突
  }
}

// 方向标识更新功能已移除

// 锁定指针（用于第一人称视角）
function lockPointer() {
  if (isFirstPerson && firstPersonControls) {
    firstPersonControls.lock();
  }
}

// 解锁指针
function unlockPointer() {
  if (firstPersonControls) {
    firstPersonControls.unlock();
  }
}

// 切换视角
function toggleView() {
  if (isFirstPerson) {
    setThirdPersonView();
  } else {
    setFirstPersonView();
  }
}

// 将相机定位到宇航员侧后方
function focusOnAstronaut() {
  if (!astronaut || isFirstPerson) return;

  // 获取宇航员位置
  const astronautPosition = new THREE.Vector3();
  astronaut.getWorldPosition(astronautPosition);

  // 计算宇航员的面部朝向
  const astronautRotation = astronaut.rotation.y;

  // 计算侧后方位置（宇航员右后方45度角）
  const sideAngle = astronautRotation + Math.PI * 0.75; // 右后方45度
  const distance = 50; // 距离宇航员的距离（非常近的特写视角）
  const height = 25; // 相机高度（更贴近宇航员）

  const cameraX = astronautPosition.x + Math.sin(sideAngle) * distance;
  const cameraY = astronautPosition.y + height;
  const cameraZ = astronautPosition.z + Math.cos(sideAngle) * distance;

  // 设置相机位置
  camera.position.set(cameraX, cameraY, cameraZ);

  // 设置相机目标为宇航员
  thirdPersonControls.target.copy(astronautPosition);
  thirdPersonControls.target.y += 1; // 稍微看向宇航员上方（更贴近）

  // 更新控制器
  thirdPersonControls.update();

  console.log("相机已定位到宇航员侧后方 - 特写视角");
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // 更新动画混合器
  if (mixer) {
    mixer.update(delta);
  }

  // 更新宇航员移动
  updateAstronautMovement();

  // 更新太阳系动画
  updateSolarSystemAnimation(delta);

  // 更新相机位置和目标（始终跟随宇航员移动）
  updateFirstPersonCamera();
  updateThirdPersonTarget();

  // 更新控制器
  if (isFirstPerson && firstPersonControls) {
    // 第一人称模式：PointerLockControls 自动处理鼠标输入
    // 相机位置已经通过 updateFirstPersonCamera 跟随宇航员
  } else if (!isFirstPerson && thirdPersonControls) {
    // 第三人称模式：更新轨道控制器
    // 相机位置由用户控制（滚轮缩放、鼠标拖拽），目标点跟随宇航员
    thirdPersonControls.update();
  }

  renderer.render(scene, camera);
}

// 键盘控制
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
};

document.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "KeyW":
      keys.forward = true;
      break;
    case "KeyS":
      keys.backward = true;
      break;
    case "KeyA":
      keys.left = true;
      break;
    case "KeyD":
      keys.right = true;
      break;
    case "Space":
      event.preventDefault(); // 防止页面滚动
      keys.up = true;
      break;
    case "KeyX":
      event.preventDefault();
      keys.down = true;
      break;
  }
});

document.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "KeyW":
      keys.forward = false;
      break;
    case "KeyS":
      keys.backward = false;
      break;
    case "KeyA":
      keys.left = false;
      break;
    case "KeyD":
      keys.right = false;
      break;
    case "Space":
      keys.up = false;
      break;
    case "KeyX":
      keys.down = false;
      break;
    case "Escape":
      if (isFirstPerson) {
        unlockPointer();
      }
      break;
  }
});

// 指针锁定状态监听
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === renderer.domElement) {
    console.log("指针已锁定 - 第一人称模式激活");
    // 隐藏提示
    const hint = document.getElementById("firstPersonHint");
    if (hint) {
      hint.style.display = "none";
    }
  } else {
    console.log("指针已解锁");
    // 如果还在第一人称模式，显示提示
    if (isFirstPerson) {
      const hint = document.getElementById("firstPersonHint");
      if (hint) {
        hint.style.display = "block";
      }
    }
  }
});

document.addEventListener("pointerlockerror", () => {
  console.log("指针锁定失败");
});

// 创建虚拟摇杆
function createJoystick() {
  const joystickContainer = document.createElement("div");
  joystickContainer.id = "joystick-container";
  joystickContainer.className = "joystick-container";

  const joystickBase = document.createElement("div");
  joystickBase.className = "joystick-base";

  const joystickKnob = document.createElement("div");
  joystickKnob.className = "joystick-knob";

  joystickBase.appendChild(joystickKnob);
  joystickContainer.appendChild(joystickBase);

  // 设置摇杆位置（左下角）
  joystickContainer.style.position = "fixed";
  joystickContainer.style.left = "20px";
  joystickContainer.style.bottom = "20px";
  joystickContainer.style.zIndex = "1000";

  document.body.appendChild(joystickContainer);

  joystick = {
    container: joystickContainer,
    base: joystickBase,
    knob: joystickKnob,
  };

  // 初始化摇杆中心位置
  const rect = joystickBase.getBoundingClientRect();
  joystickCenter.x = rect.left + rect.width / 2;
  joystickCenter.y = rect.top + rect.height / 2;

  setupJoystickEvents();
}

// 设置摇杆事件
function setupJoystickEvents() {
  if (!joystick) return;

  const knob = joystick.knob;

  // 触摸开始
  knob.addEventListener("touchstart", handleJoystickStart, { passive: false });
  document.addEventListener("touchmove", handleJoystickMove, {
    passive: false,
  });
  document.addEventListener("touchend", handleJoystickEnd, { passive: false });

  // 鼠标事件（用于桌面测试）
  knob.addEventListener("mousedown", handleJoystickStart);
  document.addEventListener("mousemove", handleJoystickMove);
  document.addEventListener("mouseup", handleJoystickEnd);
}

// 摇杆开始
function handleJoystickStart(e) {
  e.preventDefault();
  joystickActive = true;

  const touch = e.touches ? e.touches[0] : e;
  joystickCenter.x = touch.clientX;
  joystickCenter.y = touch.clientY;

  updateJoystickPosition(touch.clientX, touch.clientY);
}

// 摇杆移动
function handleJoystickMove(e) {
  if (!joystickActive) return;
  e.preventDefault();

  const touch = e.touches ? e.touches[0] : e;
  updateJoystickPosition(touch.clientX, touch.clientY);
}

// 摇杆结束
function handleJoystickEnd(e) {
  if (!joystickActive) return;
  e.preventDefault();

  joystickActive = false;
  joystickPosition.x = 0;
  joystickPosition.y = 0;

  // 重置摇杆位置
  joystick.knob.style.transform = "translate(0, 0)";
}

// 更新摇杆位置
function updateJoystickPosition(x, y) {
  const deltaX = x - joystickCenter.x;
  const deltaY = y - joystickCenter.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (distance <= joystickRadius) {
    joystickPosition.x = deltaX;
    joystickPosition.y = deltaY;
  } else {
    // 限制在圆形范围内
    const angle = Math.atan2(deltaY, deltaX);
    joystickPosition.x = Math.cos(angle) * joystickRadius;
    joystickPosition.y = Math.sin(angle) * joystickRadius;
  }

  // 更新摇杆视觉位置
  joystick.knob.style.transform = `translate(${joystickPosition.x}px, ${joystickPosition.y}px)`;
}

// 创建移动端上浮下沉按钮
function createMobileJumpButton() {
  // 上浮按钮
  const thrustUpButton = document.createElement("button");
  thrustUpButton.id = "mobile-thrust-up-button";
  thrustUpButton.className = "mobile-thrust-up-button";
  thrustUpButton.textContent = "上浮";

  // 设置上浮按钮位置（右下角）
  thrustUpButton.style.position = "fixed";
  thrustUpButton.style.right = "20px";
  thrustUpButton.style.bottom = "20px";
  thrustUpButton.style.zIndex = "1000";

  thrustUpButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    keys.up = true;
  });

  thrustUpButton.addEventListener("touchend", (e) => {
    e.preventDefault();
    keys.up = false;
  });

  thrustUpButton.addEventListener("mousedown", (e) => {
    e.preventDefault();
    keys.up = true;
  });

  thrustUpButton.addEventListener("mouseup", (e) => {
    e.preventDefault();
    keys.up = false;
  });

  // 下沉按钮
  const thrustDownButton = document.createElement("button");
  thrustDownButton.id = "mobile-thrust-down-button";
  thrustDownButton.className = "mobile-thrust-down-button";
  thrustDownButton.textContent = "下沉";

  // 设置下沉按钮位置（右下角，上浮按钮上方）
  thrustDownButton.style.position = "fixed";
  thrustDownButton.style.right = "20px";
  thrustDownButton.style.bottom = "100px";
  thrustDownButton.style.zIndex = "1000";

  thrustDownButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    keys.down = true;
  });

  thrustDownButton.addEventListener("touchend", (e) => {
    e.preventDefault();
    keys.down = false;
  });

  thrustDownButton.addEventListener("mousedown", (e) => {
    e.preventDefault();
    keys.down = true;
  });

  thrustDownButton.addEventListener("mouseup", (e) => {
    e.preventDefault();
    keys.down = false;
  });

  document.body.appendChild(thrustUpButton);
  document.body.appendChild(thrustDownButton);
}

// 鼠标点击处理函数
function onMouseClick(event) {
  if (!isEducationMode) return; // 只在科普模式下处理点击

  // 计算鼠标位置
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // 更新射线投射器
  raycaster.setFromCamera(mouse, camera);

  // 获取所有可点击的对象（行星和太阳）
  const clickableObjects = Object.values(planetModels).filter(model => model);
  
  // 检测射线与对象的交点
  const intersects = raycaster.intersectObjects(clickableObjects, true);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    // 找到包含用户数据的父对象
    let parent = clickedObject;
    while (parent && !parent.userData.name) {
      parent = parent.parent;
    }
    
    if (parent && parent.userData.name) {
      showPlanetModal(parent.userData.name, parent.userData.type);
    }
  }
}

// 行星信息数据
const planetInfo = {
  太阳: {
    name: "太阳",
    type: "恒星",
    description: "太阳是太阳系的中心恒星，是一颗G型主序星。",
    facts: [
      "质量：1.989 × 10³⁰ 千克（地球的33万倍）",
      "直径：1,392,700 公里（地球的109倍）",
      "表面温度：5,778 K（约5,505°C）",
      "年龄：约46亿年",
      "组成：73%氢，25%氦，2%其他元素"
    ],
    distance: "0 天文单位（中心）",
    orbitalPeriod: "无（中心天体）",
    dayLength: "25-35天（不同纬度）"
  },
  水星: {
    name: "水星",
    type: "类地行星",
    description: "水星是距离太阳最近的行星，也是太阳系中最小的行星。",
    facts: [
      "质量：3.301 × 10²³ 千克",
      "直径：4,879 公里",
      "表面温度：-173°C 到 427°C",
      "大气：极其稀薄",
      "特点：没有天然卫星"
    ],
    distance: "0.39 天文单位",
    orbitalPeriod: "88 天",
    dayLength: "59 天"
  },
  金星: {
    name: "金星",
    type: "类地行星",
    description: "金星是太阳系中最热的行星，被称为地球的'姐妹星'。",
    facts: [
      "质量：4.867 × 10²⁴ 千克",
      "直径：12,104 公里",
      "表面温度：462°C",
      "大气：96.5%二氧化碳",
      "特点：逆向自转"
    ],
    distance: "0.72 天文单位",
    orbitalPeriod: "225 天",
    dayLength: "243 天"
  },
  地球: {
    name: "地球",
    type: "类地行星",
    description: "地球是我们居住的星球，是已知唯一存在生命的行星。",
    facts: [
      "质量：5.972 × 10²⁴ 千克",
      "直径：12,756 公里",
      "表面温度：-89°C 到 58°C",
      "大气：78%氮气，21%氧气",
      "特点：唯一已知存在生命的行星"
    ],
    distance: "1.00 天文单位",
    orbitalPeriod: "365.25 天",
    dayLength: "24 小时"
  },
  火星: {
    name: "火星",
    type: "类地行星",
    description: "火星被称为'红色星球'，是未来人类殖民的主要候选地。",
    facts: [
      "质量：6.39 × 10²³ 千克",
      "直径：6,792 公里",
      "表面温度：-87°C 到 -5°C",
      "大气：95%二氧化碳",
      "特点：有两颗小卫星"
    ],
    distance: "1.52 天文单位",
    orbitalPeriod: "687 天",
    dayLength: "24.6 小时"
  },
  木星: {
    name: "木星",
    type: "气态巨行星",
    description: "木星是太阳系中最大的行星，被称为'气体巨人'。",
    facts: [
      "质量：1.898 × 10²⁷ 千克（地球的318倍）",
      "直径：142,984 公里",
      "大气：90%氢，10%氦",
      "特点：有79颗已知卫星",
      "大红斑：持续数百年的巨大风暴"
    ],
    distance: "5.20 天文单位",
    orbitalPeriod: "12 年",
    dayLength: "9.9 小时"
  },
  土星: {
    name: "土星",
    type: "气态巨行星",
    description: "土星以其美丽的光环系统而闻名，密度比水还小。",
    facts: [
      "质量：5.683 × 10²⁶ 千克",
      "直径：120,536 公里",
      "大气：96%氢，3%氦",
      "特点：有82颗已知卫星",
      "光环：主要由冰和岩石碎片组成"
    ],
    distance: "9.58 天文单位",
    orbitalPeriod: "29 年",
    dayLength: "10.7 小时"
  },
  天王星: {
    name: "天王星",
    type: "冰巨星",
    description: "天王星是太阳系中唯一'躺着'自转的行星。",
    facts: [
      "质量：8.681 × 10²⁵ 千克",
      "直径：51,118 公里",
      "大气：83%氢，15%氦，2%甲烷",
      "特点：有27颗已知卫星",
      "自转轴：倾斜98度"
    ],
    distance: "19.22 天文单位",
    orbitalPeriod: "84 年",
    dayLength: "17.2 小时"
  },
  海王星: {
    name: "海王星",
    type: "冰巨星",
    description: "海王星是太阳系中最远的行星，以其深蓝色和强风而闻名。",
    facts: [
      "质量：1.024 × 10²⁶ 千克",
      "直径：49,528 公里",
      "大气：80%氢，19%氦，1%甲烷",
      "特点：有14颗已知卫星",
      "风速：高达2,100公里/小时"
    ],
    distance: "30.07 天文单位",
    orbitalPeriod: "165 年",
    dayLength: "16.1 小时"
  }
};

// 显示行星信息模态框
function showPlanetModal(planetName, planetType) {
  const info = planetInfo[planetName];
  if (!info) return;

  // 创建模态框
  const modal = document.createElement("div");
  modal.className = "planet-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${info.name}</h2>
        <span class="close-btn">&times;</span>
      </div>
      <div class="modal-body">
        <div class="planet-type">${info.type}</div>
        <p class="description">${info.description}</p>
        <div class="facts-section">
          <h3>基本信息</h3>
          <ul>
            ${info.facts.map(fact => `<li>${fact}</li>`).join('')}
          </ul>
        </div>
        <div class="orbital-info">
          <div class="info-item">
            <strong>距离太阳：</strong>${info.distance}
          </div>
          <div class="info-item">
            <strong>公转周期：</strong>${info.orbitalPeriod}
          </div>
          <div class="info-item">
            <strong>自转周期：</strong>${info.dayLength}
          </div>
        </div>
      </div>
    </div>
  `;

  // 添加关闭事件
  const closeBtn = modal.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // 添加到页面
  document.body.appendChild(modal);
}

// 切换科普模式
function toggleEducationMode() {
  isEducationMode = !isEducationMode;
  
  // 更新按钮文本
  const eduButton = document.getElementById('educationModeButton');
  if (eduButton) {
    eduButton.textContent = isEducationMode ? '退出科普模式' : '科普模式';
    eduButton.className = isEducationMode ? 'edu-button active' : 'edu-button';
  }

  // 显示/隐藏提示
  const hint = document.getElementById('educationHint');
  if (hint) {
    hint.style.display = isEducationMode ? 'block' : 'none';
  }

  console.log(`科普模式${isEducationMode ? '已开启' : '已关闭'}`);
}

// 创建UI
function createUI() {
  // 检测移动设备
  isMobile = detectMobile();

  const uiContainer = document.createElement("div");
  uiContainer.className = "ui-container";

  const toggleButton = document.createElement("button");
  toggleButton.textContent = "切换视角";
  toggleButton.className = "toggle-button";
  toggleButton.addEventListener("click", toggleView);

  const focusButton = document.createElement("button");
  focusButton.textContent = "聚焦宇航员";
  focusButton.className = "focus-button";
  focusButton.addEventListener("click", focusOnAstronaut);

  const educationButton = document.createElement("button");
  educationButton.id = "educationModeButton";
  educationButton.textContent = "科普模式";
  educationButton.className = "edu-button";
  educationButton.addEventListener("click", toggleEducationMode);

  const instructions = document.createElement("div");
  instructions.className = "instructions";

  if (isMobile) {
    instructions.innerHTML = `
      <p>移动端控制：使用左下角摇杆移动宇航员</p>
      <p>垂直移动：点击右下角上浮/下沉按钮</p>
      <p>视角切换：点击切换视角按钮</p>
      <p>聚焦功能：点击聚焦宇航员按钮</p>
    `;

    // 创建移动端控制元素
    createJoystick();
    createMobileJumpButton();
  } else {
    instructions.innerHTML = `
      <p>第三人称模式：WS键移动宇航员，AD键转向</p>
      <p>第一人称模式：WASD键移动，鼠标控制视角</p>
      <p>第一人称模式：点击屏幕锁定鼠标，移动鼠标控制视角，ESC解锁</p>
      <p>垂直移动：空格键上浮，X键下沉（仅限宇航员模型）</p>
      <p>聚焦功能：点击聚焦宇航员按钮快速定位相机</p>
    `;
  }

  // 创建第一人称提示
  const firstPersonHint = document.createElement("div");
  firstPersonHint.id = "firstPersonHint";
  firstPersonHint.className = "first-person-hint";
  firstPersonHint.innerHTML = "点击屏幕激活鼠标控制";
  firstPersonHint.style.display = "none";

  // 创建科普模式提示
  const educationHint = document.createElement("div");
  educationHint.id = "educationHint";
  educationHint.className = "education-hint";
  educationHint.innerHTML = "科普模式已开启：点击行星查看详细信息";
  educationHint.style.display = "none";

  uiContainer.appendChild(toggleButton);
  uiContainer.appendChild(focusButton);
  uiContainer.appendChild(educationButton);
  uiContainer.appendChild(instructions);
  uiContainer.appendChild(firstPersonHint);
  uiContainer.appendChild(educationHint);
  document.getElementById("app").appendChild(uiContainer);
}

// 启动应用
document.querySelector("#app").innerHTML = "";
createUI();
init();
