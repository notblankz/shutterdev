import pokemonList from "@/data/pokemon-gen1.json";

export default function PokemonSprite() {
    const randomPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
    return (
        <img
            src={`https://play.pokemonshowdown.com/sprites/ani/${randomPokemon}.gif`}
            alt={`GIF of ${randomPokemon}`}
            className="w-full h-full object-contain"
        />
    )
}
