import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

// 场景变量
let scene, camera, renderer, controls;
let astronaut, mixer, clock;
let isFirstPerson = false;
let firstPersonControls, thirdPersonControls;
let astronautVelocity = new THREE.Vector3();
let astronautSpeed = 0.03;

// 全局变量：第一人称初始yaw
let firstPersonYawCenter = Math.PI;

// 初始化场景
function init() {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e); // 更明亮的深蓝色背景

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(-8, 5, -8); // 斜后上方位置

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

  // 添加地面
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 }); // 更明亮的地面颜色
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.renderOrder = 0; // 设置地面优先渲染
  scene.add(ground);

  // 移除方向标识相关代码

  // 初始化时钟
  clock = new THREE.Clock();

  // 加载宇航员模型
  loadAstronaut();

  // 初始化控制器
  initControls();

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
    "/模型存放点/astronaut/scene.gltf",
    "./模型存放点/astronaut/scene.gltf",
    "/astronaut/scene.gltf",
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
        astronaut.position.set(0, 0, 0);
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

// 方向标识功能已移除

// 更新宇航员移动
function updateAstronautMovement() {
  if (!astronaut) return;

  // 重置速度
  astronautVelocity.set(0, 0, 0);

  if (isFirstPerson) {
    // 第一人称模式：使用相机方向控制移动
    if (!firstPersonControls) return;

    // 获取相机的朝向
    const direction = new THREE.Vector3();
    firstPersonControls.getDirection(direction);

    // 计算前进和右侧方向（忽略Y轴，保持水平移动）
    const forward = new THREE.Vector3(direction.x, 0, direction.z).normalize();
    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    // WASD控制移动
    if (keys.forward) {
      astronautVelocity.add(forward.clone().multiplyScalar(astronautSpeed));
    }
    if (keys.backward) {
      astronautVelocity.add(forward.clone().multiplyScalar(-astronautSpeed));
    }
    if (keys.left) {
      astronautVelocity.add(right.clone().multiplyScalar(-astronautSpeed));
    }
    if (keys.right) {
      astronautVelocity.add(right.clone().multiplyScalar(astronautSpeed));
    }

    // 更新宇航员朝向（朝向移动方向）
    if (astronautVelocity.length() > 0) {
      const moveDirection = astronautVelocity.clone().normalize();
      astronaut.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
    }
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

  // 限制移动范围（扩大到50x50区域）
  astronaut.position.x = Math.max(-50, Math.min(50, astronaut.position.x));
  astronaut.position.z = Math.max(-50, Math.min(50, astronaut.position.z));
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
  astronaut.position.set(0, 0, 0);
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
    thirdPersonControls.minDistance = 3;
    thirdPersonControls.maxDistance = 50; // 增加最大距离
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
    // 相对于宇航员的位置 - 斜后上方
    const astronautPosition = new THREE.Vector3();
    astronaut.getWorldPosition(astronautPosition);

    // 只在切换视角时设置初始位置，之后让用户控制
    camera.position.set(
      astronautPosition.x - 8, // 后方
      astronautPosition.y + 5, // 上方
      astronautPosition.z - 8 // 后方
    );
    thirdPersonControls.target.copy(astronautPosition);
    thirdPersonControls.target.y += 1; // 看向宇航员头部位置
  } else {
    // 如果没有宇航员，使用默认位置 - 斜后上方
    camera.position.set(-8, 5, -8);
    thirdPersonControls.target.set(0, 1, 0);
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
    case "Escape":
      if (isFirstPerson) {
        unlockPointer();
      }
      break;
  }
});

// 窗口大小调整
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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

// 创建UI
function createUI() {
  const uiContainer = document.createElement("div");
  uiContainer.className = "ui-container";

  const toggleButton = document.createElement("button");
  toggleButton.textContent = "切换视角";
  toggleButton.className = "toggle-button";
  toggleButton.addEventListener("click", toggleView);

  const instructions = document.createElement("div");
  instructions.className = "instructions";
  instructions.innerHTML = `
    <p>第三人称模式：WASD键移动宇航员（以宇航员朝向为准）</p>
    <p>第一人称模式：WASD键移动相机，鼠标控制视角</p>
    <p>第一人称模式：点击屏幕锁定鼠标，移动鼠标控制视角，ESC解锁</p>
    <p>第三人称模式：跟随宇航员移动，鼠标拖拽旋转视角，滚轮缩放</p>
  `;

  // 创建第一人称提示
  const firstPersonHint = document.createElement("div");
  firstPersonHint.id = "firstPersonHint";
  firstPersonHint.className = "first-person-hint";
  firstPersonHint.innerHTML = "点击屏幕激活鼠标控制";
  firstPersonHint.style.display = "none";

  uiContainer.appendChild(toggleButton);
  uiContainer.appendChild(instructions);
  uiContainer.appendChild(firstPersonHint);
  document.getElementById("app").appendChild(uiContainer);
}

// 启动应用
document.querySelector("#app").innerHTML = "";
createUI();
init();
