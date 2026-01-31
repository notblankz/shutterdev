import fs from "fs"

async function getPokemon() {
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=151")
    const data = await res.json()
    return data.results.map(p => p.name)
}

function addPokemonToJSON(pokemonList) {
    const json = JSON.stringify(pokemonList, null, 2)
    fs.writeFileSync("../src/data/pokemon-gen1.json", json)
    console.log("pokemon-gen1.json written successfully")
}

async function main() {
    const pokemonList = await getPokemon()
    addPokemonToJSON(pokemonList)
}

main()
