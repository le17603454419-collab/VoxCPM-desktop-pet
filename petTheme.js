const PET_THEME = {
  id: "ragdoll-cat",
  name: "糖团",
  stylesheet: "petThemes/ragdoll-cat.css",
  sprites: {
    idle: "assets/pets/tangtuan/idle.png",
    happy: "assets/pets/tangtuan/happy.png",
    thinking: "assets/pets/tangtuan/thinking.png",
    speaking: "assets/pets/tangtuan/speaking.png",
    sleep: "assets/pets/tangtuan/sleep.png",
    wave: "assets/pets/tangtuan/wave.png",
  },
  template: `
    <div class="shadow"></div>
    <div id="pet" class="pet-body">
      <img id="petSprite" class="pet-sprite" src="assets/pets/tangtuan/idle.png" alt="糖团" draggable="false" />
    </div>
  `,
};

window.PET_THEME = PET_THEME;