from __future__ import annotations

from pydantic import BaseModel, ConfigDict


def to_camel_case(value: str) -> str:
    chunks = value.split("_")
    return chunks[0] + "".join(chunk.capitalize() for chunk in chunks[1:])


class CamelSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel_case,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
        str_strip_whitespace=True,
    )
