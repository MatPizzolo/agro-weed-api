"""Endpoint de metadatos de especies."""

from fastapi import APIRouter

from weed_api.api.schemas import SpeciesInfo
from weed_api.species import SPECIES

router = APIRouter(tags=["species"])


@router.get("/species", response_model=list[SpeciesInfo])
def list_species() -> list[SpeciesInfo]:
    return SPECIES
