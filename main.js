import * as THREE from 'three'


const KEYS = {
  'a': 65,
  's': 83,
  'w': 87,
  'd': 68,
};


function clamp(x, a, b) {
  x = Math.max(x, a)
  x = Math.min(x, b)
  return x
}


class InputController {
  constructor() {
    this.target_ = document
    // this.target_ = target || document
    this.initialize_()
  }

  initialize_() {
    this.current_ = {
      leftButton: false,
      rightButton: false,
      mouseXDelta: 0,
      mouseYDelta: 0,
      mouseX: 0,
      mouseY: 0,
      pointer_lock: false,
    };
    this.previous_ = null;
    this.keys_ = {};
    this.previousKeys_ = {};
    this.target_.addEventListener('mousedown', e => this.onMouseDown_(e), false);
    this.target_.addEventListener('mousemove', e => this.onMouseMove_(e), false);
    this.target_.addEventListener('mouseup', e => this.onMouseUp_(e), false);
    this.target_.addEventListener('keydown', e => this.onKeyDown_(e), false);
    this.target_.addEventListener('keyup', e => this.onKeyUp_(e), false);
    this.target_.addEventListener('pointerlockchange', e => this.onPointerLockChange_(e), false);
  }

  onMouseMove_(e) {
    // this.current_.mouseX = e.pageX - window.innerWidth / 2;
    // this.current_.mouseY = e.pageY - window.innerHeight / 2;
    const movement_x = e.movementX || 0;
    const movement_y = e.movementY || 0;
    this.current_.mouseX += movement_x;
    this.current_.mouseY += movement_y;

    if (this.previous_ === null) {
      this.previous_ = {...this.current_};
    }

    this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
    this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
  }

  onMouseDown_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = true;
        break;
      }
      case 2: {
        this.current_.rightButton = true;
        break;
      }
    }
  }

  onMouseUp_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = false;
        break;
      }
      case 2: {
        this.current_.rightButton = false;
        break;
      }
    }
  }

  onKeyDown_(e) {
    this.keys_[e.keyCode] = true;
  }

  onKeyUp_(e) {
    this.keys_[e.keyCode] = false;
  }

  onPointerLockChange_(e) {   
    this.current_.pointer_lock = !(document.pointerLockElement == null)
  }

  key(keyCode) {
    return !!this.keys_[keyCode];
  }

  isReady() {
    return this.previous_ !== null;
  }

  update(_) {
    if (this.previous_ !== null) {
      this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
      this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

      this.previous_ = {...this.current_};
    }
  }
};


class FirstPersonCamera {
  constructor(camera, objects) {
    this.camera_ = camera;
    this.input_ = new InputController();
    this.rotation_ = new THREE.Quaternion();
    this.translation_ = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
    this.phi_ = 0;
    this.phiSpeed_ = 8;
    this.theta_ = 0;
    this.thetaSpeed_ = 5;
    this.headBobActive_ = false;
    this.headBobTimer_ = 0;
    this.objects_ = objects;
  }

  update(timeElapsedS) {
    if (this.input_.current_.pointer_lock) {
      this.updateRotation_(timeElapsedS);
      this.updateCamera_(timeElapsedS);
      this.updateTranslation_(timeElapsedS);
      this.updateHeadBob_(timeElapsedS);
    }
    this.input_.update(timeElapsedS);
  }

  updateCamera_(_) {
    this.camera_.quaternion.copy(this.rotation_);
    this.camera_.position.copy(this.translation_);
    this.camera_.position.y += Math.sin(this.headBobTimer_ * 10) * .25;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation_);

    const dir = forward.clone();

    forward.multiplyScalar(100);
    forward.add(this.translation_);

    let closest = forward;
    const result = new THREE.Vector3();
    const ray = new THREE.Ray(this.translation_, dir);
    for (let i = 0; i < this.objects_.lengeewth; ++i) {
      if (ray.intersectBox(this.objects_[i], result)) {
        if (result.distanceTo(ray.origin) < closest.distanceTo(ray.origin)) {
          closest = result.clone();
        }
      }
    }

    this.camera_.lookAt(closest);
  }

  updateHeadBob_(timeElapsedS) {
    if (this.headBobActive_) {
      const wavelength = Math.PI;
      const nextStep = 1 + Math.floor(((this.headBobTimer_ + 0.000001) * 10) / wavelength);
      const nextStepTime = nextStep * wavelength / 10;
      this.headBobTimer_ = Math.min(this.headBobTimer_ + timeElapsedS, nextStepTime);

      if (this.headBobTimer_ == nextStepTime) {
        this.headBobActive_ = false;
      }
    }
  }

  updateTranslation_(timeElapsedS) {
    const forwardVelocity = (this.input_.key(KEYS.w) ? 1 : 0) + (this.input_.key(KEYS.s) ? -1 : 0)
    const strafeVelocity = (this.input_.key(KEYS.a) ? 1 : 0) + (this.input_.key(KEYS.d) ? -1 : 0)

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVelocity * timeElapsedS * 10);

    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVelocity * timeElapsedS * 10);

    this.translation_.add(forward);
    this.translation_.add(left);

    if (forwardVelocity != 0 || strafeVelocity != 0) {
      this.headBobActive_ = true;
    }
  }

  updateRotation_(timeElapsedS) {

    const xh = this.input_.current_.mouseXDelta / window.innerWidth;
    const yh = this.input_.current_.mouseYDelta / window.innerHeight;

    this.phi_ += -xh * this.phiSpeed_;
    this.theta_ = clamp(this.theta_ + -yh * this.thetaSpeed_, -Math.PI / 3, Math.PI / 3);

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
    const qz = new THREE.Quaternion();
    qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qz);

    this.rotation_.copy(q);
  }
}


function resize(canvas, camera, renderer) {
  // grab the current actual width and height as seen by client
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const need_resize = canvas.width !== width || canvas.height !== height
  if (need_resize) {
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  return need_resize
}


function start_render(renderer, scene, camera, update_fn) {
  function render_fn(time) {
    resize(renderer.domElement, camera, renderer)
    update_fn(time)
    renderer.render(scene, camera)
    requestAnimationFrame(render_fn)
  }
  requestAnimationFrame(render_fn)
}


function get_renderer() {
  const canvas = document.querySelector('#world')

  // renderer
  const renderer = new THREE.WebGLRenderer({
    // antialias: true, // performance hit, but looks better
    canvas: canvas
  })
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // capture mouse on click
  renderer.domElement.onclick = () => renderer.domElement.requestPointerLock()

  return renderer
}


function get_camera() {
  const field_of_view = 75
  const aspect_ratio = 2 // the canvas default
  const near_limit = 0.1
  const far_limit = 15
  const camera = new THREE.PerspectiveCamera(
    field_of_view, aspect_ratio, near_limit, far_limit)
  camera.position.z = 5
  camera.position.y = 3
  return camera
}


function init_scene() {
  // scene 
  const scene = new THREE.Scene()

  // add a light 
  const color = 0xFFFFFF
  const intensity = 1
  const light = new THREE.DirectionalLight(color, intensity)
  light.position.set(-1, 2, 4)
  scene.add(light)

  // ambient light
  const ambient_color = 0x404040
  const ambient_intensity = 1
  const ambient_light = new THREE.AmbientLight(ambient_color, ambient_intensity)
  scene.add(ambient_light)

  // background
  const loader = new THREE.CubeTextureLoader()
  const texture = loader.load([
      './assets/bg/posx.png',
      './assets/bg/negx.png',
      './assets/bg/posy.png',
      './assets/bg/negy.png',
      './assets/bg/posz.png',
      './assets/bg/negz.png',
  ])
  scene.background = texture

  // ground 
  const ground_geometry = new THREE.PlaneGeometry(10, 10)
  const ground_material = new THREE.MeshPhongMaterial({
    color: 0x999999,
    side: THREE.DoubleSide,
  })
  const ground_mesh = new THREE.Mesh(ground_geometry, ground_material)
  ground_mesh.rotation.x = Math.PI / 2
  ground_mesh.receiveShadow = true
  scene.add(ground_mesh)

  return scene
}


function main() {
  const renderer = get_renderer()
  const camera = get_camera()
  const scene = init_scene()

  const fps_camera = new FirstPersonCamera(camera, [])

  // caputre mouse events TODO: move this
  // renderer.domElement.onclick = () => renderer.domElement.requestPointerLock()




  // cube
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhongMaterial({
      color: 0x44aa88
    })
  )
  scene.add(cube)

  // draw the scene
  let last_time = 0
  const render = time => {
    time *= 0.001 // seconds
    fps_camera.update(time - last_time)
    cube.rotation.x = time
    cube.rotation.y = time
    scene.add(cube)
    last_time = time
  }

  start_render(renderer, scene, camera, render)
}


export default main