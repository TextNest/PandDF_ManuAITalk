from __future__ import annotations
import math
from typing import Any, Dict, Optional

import numpy as np
import pynanoinstantmeshes
import torch
import torch.nn.functional as F
import trimesh
from jaxtyping import Float, Integer
from torch import Tensor

from sf3d.models.utils import dot

import trimesh



class Mesh:
    def __init__(
        self, v_pos: Float[Tensor, "Nv 3"], t_pos_idx: Integer[Tensor, "Nf 3"], **kwargs
    ) -> None:
        self.v_pos: Float[Tensor, "Nv 3"] = v_pos
        self.t_pos_idx: Integer[Tensor, "Nf 3"] = t_pos_idx
        self._v_nrm: Optional[Float[Tensor, "Nv 3"]] = None
        self._v_tng: Optional[Float[Tensor, "Nv 3"]] = None
        self._v_tex: Optional[Float[Tensor, "Nt 3"]] = None
        self._edges: Optional[Integer[Tensor, "Ne 2"]] = None
        self.extras: Dict[str, Any] = {}
        for k, v in kwargs.items():
            self.add_extra(k, v)



    def add_extra(self, k, v) -> None:
        self.extras[k] = v

    @property
    def requires_grad(self):
        return self.v_pos.requires_grad

    @property
    def v_nrm(self):
        if self._v_nrm is None:
            self._v_nrm = self._compute_vertex_normal()
        return self._v_nrm

    @property
    def v_tng(self):
        if self._v_tng is None:
            self._v_tng = self._compute_vertex_tangent()
        return self._v_tng

    @property
    def v_tex(self):
        if self._v_tex is None:
            self.unwrap_uv()
        return self._v_tex

    @property
    def edges(self):
        if self._edges is None:
            self._edges = self._compute_edges()
        return self._edges

    def _compute_vertex_normal(self):
        i0 = self.t_pos_idx[:, 0]
        i1 = self.t_pos_idx[:, 1]
        i2 = self.t_pos_idx[:, 2]

        v0 = self.v_pos[i0, :]
        v1 = self.v_pos[i1, :]
        v2 = self.v_pos[i2, :]

        face_normals = torch.cross(v1 - v0, v2 - v0, dim=-1)

        # Splat face normals to vertices
        v_nrm = torch.zeros_like(self.v_pos)
        v_nrm.scatter_add_(0, i0[:, None].repeat(1, 3), face_normals)
        v_nrm.scatter_add_(0, i1[:, None].repeat(1, 3), face_normals)
        v_nrm.scatter_add_(0, i2[:, None].repeat(1, 3), face_normals)

        # Normalize, replace zero (degenerated) normals with some default value
        v_nrm = torch.where(
            dot(v_nrm, v_nrm) > 1e-20, v_nrm, torch.as_tensor([0.0, 0.0, 1.0]).to(v_nrm)
        )
        v_nrm = F.normalize(v_nrm, dim=1)

        if torch.is_anomaly_enabled():
            assert torch.all(torch.isfinite(v_nrm))

        return v_nrm

    def _compute_vertex_tangent(self):
        vn_idx = [None] * 3
        pos = [None] * 3
        tex = [None] * 3
        for i in range(0, 3):
            pos[i] = self.v_pos[self.t_pos_idx[:, i]]
            tex[i] = self.v_tex[self.t_pos_idx[:, i]]
            # t_nrm_idx is always the same as t_pos_idx
            vn_idx[i] = self.t_pos_idx[:, i]

        tangents = torch.zeros_like(self.v_nrm)
        tansum = torch.zeros_like(self.v_nrm)

        # Compute tangent space for each triangle
        duv1 = tex[1] - tex[0]
        duv2 = tex[2] - tex[0]
        dpos1 = pos[1] - pos[0]
        dpos2 = pos[2] - pos[0]

        tng_nom = dpos1 * duv2[..., 1:2] - dpos2 * duv1[..., 1:2]

        denom = duv1[..., 0:1] * duv2[..., 1:2] - duv1[..., 1:2] * duv2[..., 0:1]

        # Avoid division by zero for degenerated texture coordinates
        denom_safe = denom.clip(1e-6)
        tang = tng_nom / denom_safe

        # Update all 3 vertices
        for i in range(0, 3):
            idx = vn_idx[i][:, None].repeat(1, 3)
            tangents.scatter_add_(0, idx, tang)  # tangents[n_i] = tangents[n_i] + tang
            tansum.scatter_add_(
                0, idx, torch.ones_like(tang)
            )  # tansum[n_i] = tansum[n_i] + 1
        # Also normalize it. Here we do not normalize the individual triangles first so larger area
        # triangles influence the tangent space more
        tangents = tangents / tansum

        # Normalize and make sure tangent is perpendicular to normal
        tangents = F.normalize(tangents, dim=1)
        tangents = F.normalize(tangents - dot(tangents, self.v_nrm) * self.v_nrm)

        if torch.is_anomaly_enabled():
            assert torch.all(torch.isfinite(tangents))

        return tangents

    def quad_remesh(
        self,
        quad_vertex_count: int = -1,
        quad_rosy: int = 4,
        quad_crease_angle: float = -1.0,
        quad_smooth_iter: int = 2,
        quad_align_to_boundaries: bool = False,
    ) -> Mesh:
        if quad_vertex_count < 0:
            quad_vertex_count = self.v_pos.shape[0]
        v_pos = self.v_pos.detach().cpu().numpy().astype(np.float32)
        t_pos_idx = self.t_pos_idx.detach().cpu().numpy().astype(np.uint32)

        new_vert, new_faces = pynanoinstantmeshes.remesh(
            v_pos,
            t_pos_idx,
            quad_vertex_count // 4,
            rosy=quad_rosy,
            posy=4,
            creaseAngle=quad_crease_angle,
            align_to_boundaries=quad_align_to_boundaries,
            smooth_iter=quad_smooth_iter,
            deterministic=False,
        )

        # Briefly load in trimesh
        mesh = trimesh.Trimesh(vertices=new_vert, faces=new_faces.astype(np.int32))

        v_pos = torch.from_numpy(mesh.vertices).to(self.v_pos).contiguous()
        t_pos_idx = torch.from_numpy(mesh.faces).to(self.t_pos_idx).contiguous()

        # Create new mesh
        return Mesh(v_pos, t_pos_idx)

    def triangle_remesh(
        self,
        triangle_average_edge_length_multiplier: Optional[float] = None,
        triangle_remesh_steps: int = 10,
        triangle_vertex_count=-1,
    ):
        if triangle_vertex_count <= 0:
            return self

        v_pos_np = self.v_pos.detach().cpu().numpy()
        t_pos_idx_np = self.t_pos_idx.detach().cpu().numpy()

        # Create a trimesh object
        mesh = trimesh.Trimesh(vertices=v_pos_np, faces=t_pos_idx_np)

        # Use trimesh to simplify the mesh to the target vertex count
        # Note: trimesh simplifies based on face count, so we estimate.
        # A more direct vertex count simplification might require a different method or library,
        # but this is a good approximation.
        if mesh.vertices.shape[0] > triangle_vertex_count:
            # Estimate target face count, assuming a typical vertex-to-face ratio of ~2
            target_face_count = int(triangle_vertex_count * (mesh.faces.shape[0] / mesh.vertices.shape[0]))
            mesh = mesh.simplify_quadric_decimation(target_face_count)

        # Convert back to torch
        v_pos = torch.from_numpy(mesh.vertices).to(self.v_pos.dtype).to(self.v_pos.device).contiguous()
        t_pos_idx = torch.from_numpy(mesh.faces).to(self.t_pos_idx.dtype).to(self.t_pos_idx.device).contiguous()

        # Create new mesh
        return Mesh(v_pos, t_pos_idx)

    def unwrap_uv(
        self,
        **kwargs,
    ) -> "Mesh":
        # Create a trimesh object
        v_pos_np = self.v_pos.detach().cpu().numpy()
        t_pos_idx_np = self.t_pos_idx.detach().cpu().numpy()
        mesh = trimesh.Trimesh(vertices=v_pos_np, faces=t_pos_idx_np, process=False)
        
        # Use trimesh to unwrap
        # This returns a new mesh with UV coordinates
        unwrapped_mesh = trimesh.unwrap.unwrap_and_pack(mesh)

        # Trimesh might change vertex order or count. We need to update our mesh.
        new_v_pos = torch.from_numpy(unwrapped_mesh.vertices).to(self.v_pos.dtype).to(self.v_pos.device)
        new_t_pos_idx = torch.from_numpy(unwrapped_mesh.faces).to(self.t_pos_idx.dtype).to(self.t_pos_idx.device)
        
        # UV coordinates are in visual.uv
        uv_coords = torch.from_numpy(unwrapped_mesh.visual.uv).to(self.v_pos.dtype).to(self.v_pos.device)

        # Trimesh applies UVs per-vertex. We need to handle this.
        # The simplest way is to create a new mesh with the unwrapped data.
        # Note: This changes the mesh structure to match the unwrapped version.
        self.v_pos = new_v_pos
        self.t_pos_idx = new_t_pos_idx
        self._v_tex = uv_coords
        self._v_nrm = self._compute_vertex_normal() # Re-compute normals
        self._v_tng = self._compute_vertex_tangent() # Re-compute tangents
        
        return self

    def _compute_edges(self):
        # Compute edges
        edges = torch.cat(
            [
                self.t_pos_idx[:, [0, 1]],
                self.t_pos_idx[:, [1, 2]],
                self.t_pos_idx[:, [2, 0]],
            ],
            dim=0,
        )
        edges = edges.sort()[0]
        edges = torch.unique(edges, dim=0)
        return edges
