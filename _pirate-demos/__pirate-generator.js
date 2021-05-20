var pirateHats = [
    "imgs/1-hats/1.png",
    "imgs/1-hats/2.png",
    "imgs/1-hats/3.png",
    "imgs/1-hats/4.png",
    "imgs/1-hats/5.png"
];

var pirateSword = [
    "imgs/2-sword/1.png",
    "imgs/2-sword/2.png",
    "imgs/2-sword/3.png",
    "imgs/2-sword/4.png",
    "imgs/2-sword/5.png"
];

var piratePants = [
    "imgs/3-pants/1.png",
    "imgs/3-pants/2.png",
    "imgs/3-pants/3.png",
    "imgs/3-pants/4.png",
    "imgs/3-pants/5.png"
];

var pirateBoots = [
    "imgs/4-boots/1.png",
    "imgs/4-boots/2.png",
    "imgs/4-boots/3.png",
    "imgs/4-boots/4.png",
    "imgs/4-boots/5.png"
];

var pirateJacket = [
    "imgs/5-jacket/1.png",
    "imgs/5-jacket/2.png",
    "imgs/5-jacket/3.png",
    "imgs/5-jacket/4.png",
    "imgs/5-jacket/5.png"
];

var pirateFacialHair = [
    "imgs/6-facial-hair/1.png",
    "imgs/6-facial-hair/2.png",
    "imgs/6-facial-hair/3.png",
    "imgs/6-facial-hair/4.png",
    "imgs/6-facial-hair/5.png"
];

var pirateAnimal = [
    "imgs/7-animal/1.png",
    "imgs/7-animal/2.png",
    "imgs/7-animal/3.png",
    "imgs/7-animal/4.png",
    "imgs/7-animal/5.png"
];

// Updated values for new formula
var pirateBounty = [
    // common
    50,
    // uncommon
    500,
    // rare
    1000,
    // epic
    25000,
    // legendary
    100000
];

var rarityName = [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary',
];

var pirateRank = [
    "Crewmate",
    "Carpenter",
    "Navigator",
    "Quartermaster",
    "Captain"
];

var pirateFirstName = ["Kid","Old","Toe","Sam","William","Isaac","Steve","Frank","Angel","Grubby","Chop","Wallace","Rat","Thomas","Tom","Radley","Butch","Clive","Ruston","Carlye","Mike","David","Dave","Gary","Hansel","George","Malvo","Dirty","Chipper","Oscar","Gordon","Vince","Samuel","Rascal","Billy","Bill","Pete","Parry","Beacon","Booth","Bancroft","Radbert","Monkey","Jack","John","Gilson","Clayborne","Atworth","Stokley","Corsair","Treason","Sparrow","Shady","Swab","Buccaneer","Fox","Braveheart","Cranky","Blunder","Riot","Cook","Albatross","Savage","Rage","Fool","Phantasm","Ghost","Hero","Slick","Cold","Iron","Plank","Crafty","Privater","Snake","Tooth","Rigger","Silver","Toxic","Executioner","Whitebeard","Blackbeard","Black","Devil","Golden","Morgan","Spike","Diamond","Mad","Bones","Storm","Gold","Jolly","Bloody","King","Lord","Gabriel","James ","Derryl","Davy"];

var pirateLastName = ["Holt", "Bristol", "Foy", "Gail", "Kent", "Ashes", "Rhys", "Cronenberg", "Crawford", "Combs", "Preston", "Stone", "Law", "Peddle", "Newsbury", "Addington", "Oliver", "Huxley", "Morris", "Vexx", "Penney", "Drakkar", "Thorpe", "Dred", "Harrington", "Sampson", "Shelley", "Buckley", "Straw Hat", "Brooks", "Vaughn", "Reeves", "Earle", "Duke", "Whiteley", "Seaman", "Marlowe", "Tydes", "Wright", "Smith", "Hastings", "Carlton", "Bradford", "Arnes", "Wither", "Hayward", "Emmit", "Hook", "Fiske", "Flint", "Blunderbuss", "Mug", "Turner", "The Unseen", "The Drunk", "Four Eyes", "Mad Eyes", "The Cruel", "Backstabber", "Fleming", "Seafarer", "The Disfigured", "Reaper", "Raider", "Foul", "Grimace", "Dawg", "Rotten", "Firestorm", "Wolf", "Shooter", "Smasher", "Hawkins", "Cutthroat", "Gunner", "Goldhook", "Ironhook", "Master", "The Drowned", "The Dreadful", "Cannon", "Hawk", "Kraken", "Lighting", "The Rascal", "The Emperor", "The Evil", "Razorface", "Roger", "O'Fish", "Two-teeth", "Greybeard", "Darkskull", "The Handsome", "Immortal", "Jones", "Butcher", "The Feared", "Thunder", "Gunpowder"];

function generateImage(seed, index = 1) {
    var character = document.getElementById("character_" + index)
    character.setAttribute('data-seed', seed)
    var hatString = "" ;
    var swordString = "" ;
    var pantsString = "" ;
    var bootsString = "" ;
    var jacketString = "" ;
    var facialhairString = "" ;
    var animalString = "" ;

    var bountyString = "" ;
    var firstnameString = "" ;
    var lastnameString = "" ;

    var hatRNG = new Math.seedrandom(hatString + seed + "hat");
    var swordRNG = new Math.seedrandom(swordString + seed + "sword");
    var pantsRNG = new Math.seedrandom(pantsString + seed + "pants");
    var bootsRNG = new Math.seedrandom(bootsString + seed + "boots");
    var jacketRNG = new Math.seedrandom(jacketString + seed + "jacket");
    var facialhairRNG = new Math.seedrandom(facialhairString + seed + "facialhair");
    var animalRNG = new Math.seedrandom(animalString + seed + "animal");

    var bountyRNG = new Math.seedrandom(bountyString + seed + "bounty");
    var firstnameRNG = new Math.seedrandom(firstnameString + seed + "firstname");
    var lastnameRNG = new Math.seedrandom(lastnameString + seed + "lastname");

    var hatNumber = returnRarity(hatRNG, seed);
    var swordNumber = returnRarity(swordRNG, seed);
    var pantsNumber = returnRarity(pantsRNG, seed);
    var bootsNumber = returnRarity(bootsRNG, seed);
    var jacketNumber = returnRarity(jacketRNG, seed);
    var facialhairNumber = returnRarity(facialhairRNG, seed);
    var animalNumber = returnRarity(animalRNG, seed);

    var bounty = [hatNumber, swordNumber, pantsNumber, bootsNumber, jacketNumber, facialhairNumber, animalNumber]
        .reduce((sum, val) => sum + pirateBounty[val - 1], 0);

    var bountyNumber = returnRarity(bountyRNG, seed);
    var firstnameNumber = Math.trunc((firstnameRNG.quick()*100));
    var lastnameNumber = Math.trunc((lastnameRNG.quick()*100));
    var rankNumber = computeRank(bounty);
    var rank = pirateRank[rankNumber-1];

    character.querySelector('.hat').src = pirateHats[hatNumber-1];
    character.querySelector('.sword').src = pirateSword[swordNumber-1];
    character.querySelector('.pants').src = piratePants[pantsNumber-1];
    character.querySelector('.boots').src = pirateBoots[bootsNumber-1];
    character.querySelector('.jacket').src = pirateJacket[jacketNumber-1];
    character.querySelector('.facialhair').src = pirateFacialHair[facialhairNumber-1];
    character.querySelector('.animal').src = pirateAnimal[animalNumber-1];

    character.querySelector('.bounty').textContent = (new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(bounty)).substr(1);

    // Math.trunc((x.quick()*100)) returns something between 0 and 99, if we -1 and draw 0 we'll get
    // an undefined squadronLeader: squadronLeader[-1] ;)
    var fullname = pirateFirstName[firstnameNumber] + " " + pirateLastName[lastnameNumber]
    character.querySelector('.fullname').textContent = fullname;
    character.querySelector('.firstname').textContent = pirateFirstName[firstnameNumber];
    character.querySelector('.lastname').textContent = pirateLastName[lastnameNumber];

    character.querySelector('.seed').textContent = seed;
    character.querySelector('.rank').textContent = rank;

    character.querySelector('.seed_description').textContent = seed;
    character.querySelector('.rarity_description').textContent = rarityDescription({
        fullname,
        rankNumber,
        hatNumber,
        swordNumber,
        pantsNumber,
        bootsNumber,
        jacketNumber,
        facialhairNumber,
        animalNumber,
        bounty,
    })
    character.querySelector('.rarity_tags').textContent = rarityTags({
        rank,
        hatNumber,
        swordNumber,
        pantsNumber,
        bootsNumber,
        jacketNumber,
        facialhairNumber,
        animalNumber,
    })

    console.log({ hatNumber, swordNumber, pantsNumber, bootsNumber, jacketNumber, facialhairNumber, animalNumber });
    console.log({ bountyNumber, firstnameNumber, lastnameNumber })
    console.log(pirateBounty[bountyNumber-1], pirateFirstName[firstnameNumber], pirateLastName[lastnameNumber], pirateRank[rankNumber-1]);
}

function returnRarity(rng, seed) {
    seed = seed.match(/(.*)_\d+$/)[1]
    if (rarityName.includes(seed)) {
        return rarityName.indexOf(seed) + 1
    }
    var generatedNumber = rng.quick();
    var generatedNumber = generatedNumber*100;
    var generatedNumber = Math.trunc(generatedNumber);

    // generatedNumber is 0 1 … 98 99
    // 1%
    if (generatedNumber >= 99) {
        return 5;
    }
    // >= 94 < 99 so 5%
    if (generatedNumber >= 94) {
        return 4;
    }
    // >= 79 < 94 so 15%
    if (generatedNumber >= 79) {
        return 3;
    }
    // >= 49 < 79 so 30%
    if (generatedNumber >= 49) {
        return 2;
    }
    // >= 0 < 49 so 50%
    return 1
}

function computeRank (bounty) {
    if (bounty >= 100000) return 5
    if (bounty >= 27500) return 4
    if (bounty >= 4000) return 3
    if (bounty >= 2500) return 2
    return 1
}

function rarityDescription({
    fullname,
    rankNumber,
    hatNumber,
    swordNumber,
    pantsNumber,
    bootsNumber,
    jacketNumber,
    facialhairNumber,
    animalNumber,
    bounty,
}) {
    return fullname + ' is a ' +
        pirateRank[rankNumber - 1] + ' and has: ' +
        rarityName[hatNumber - 1] + ' hat, ' +
        rarityName[facialhairNumber - 1] + ' beard, ' +
        rarityName[swordNumber - 1] + ' sword, ' +
        rarityName[jacketNumber - 1] + ' jacket, ' +
        rarityName[pantsNumber - 1] + ' pants, ' +
        rarityName[bootsNumber - 1] + ' boots, ' +
        rarityName[animalNumber - 1] + ' animal. ' +
        'The total bounty is ' + bounty + '. '
}

function rarityTags({
    rank,
    hatNumber,
    swordNumber,
    pantsNumber,
    bootsNumber,
    jacketNumber,
    facialhairNumber,
    animalNumber,
}) {
    return [
        rank.toLowerCase(),
        rarityName[hatNumber - 1] + 'hat',
        rarityName[facialhairNumber - 1] + 'beard',
        rarityName[swordNumber - 1] + 'sword',
        rarityName[jacketNumber - 1] + 'jacket',
        rarityName[pantsNumber - 1] + 'pants',
        rarityName[bootsNumber - 1] + 'boots',
        rarityName[animalNumber - 1] + 'animal',
    ].join(', ')
}

document.addEventListener('click', async function (e) {
    if (e.target.classList.contains('btnGen')) {
        document.getElementById("loading").style.display = "block";
        e.target.setAttribute('disabled', true)

        for (let i = 1; i < 30; i++) {
            let char = document.getElementById('character_' + i)
            if (char) char.remove()
        }

        var seed = document.getElementById('txtJob').value.trim();
        var tx, index;
        if (rarityName.includes(seed)) {
            tx = {burned_amount: 1}
            index = 1
            console.log({tx, index})
        } else {
            ;({tx, index} = await findBurn(seed));
        }
        console.log({tx, index})

        if (typeof tx === 'undefined' || index === -1) {
            document.querySelector('.overlay-content > p').innerHTML = 'Error<br>please reload and retry'
            return
        }

        var seeds = [];
        if (/_\d+$/.test(seed)) {
            seeds.push(seed)
        } else {
            for (let i = 1; i <= tx.burned_amount; i++) {
                seeds.push(seed + '_' + i)
            }
        }

        for (let i = 1; i <= seeds.length; i++) {
            var clone = document.getElementById('character_0').cloneNode(true);
            clone.setAttribute('id', "character_" + i);
            document.querySelector('.characters').appendChild( clone );
        }
        document.getElementById('character_0').classList.add('hidden');

        for (let i = 1; i <= seeds.length; i++) {
            var character = document.getElementById("character_" + i);
            character.querySelectorAll(".current_supply").forEach(elt => {
                elt.textContent = index + i;
            });
            character.querySelector('.btnSave').setAttribute('data-index', i)
            generateImage(seeds[i - 1], i);
        }

        document.querySelector('.generation_result').textContent = 'Generated ' + seeds.length + ' crewmate' + (seeds.length === 1 ? '' : 's') + '. Reload the page to generate other pirates.'
        document.getElementById("loading").style.display = "none";
        console.log('found')
    } else if (e.target.classList.contains('btnSave')) {
        var index = e.target.getAttribute('data-index');
        var character = document.getElementById("character_" + index);
        var seed = character.getAttribute('data-seed');
        var name = character.querySelector('.fullname').textContent

        var eltToRender = character.querySelector('.widget');

        var canvas = await html2canvas(eltToRender, {
            windowWidth: document.querySelector('body').scrollWidth,
            windowHeight: document.querySelector('body').scrollHeight,
            x: 0,
            y: character.offsetTop
        })
        // document.querySelector('.characters').appendChild(canvas)

        var a = document.createElement('a');
        a.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        a.download = (seed + ' ' + name + '.png').replace(/ /g, '_');
        a.click();
    }
}, false);
