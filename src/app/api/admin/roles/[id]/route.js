import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Role, User, RolePermissions } from '@/lib/models';

// PATCH /api/admin/roles/[id] — update label, isDefault, sortOrder
// Cannot change the name of a system role; name is always derived from label for non-system roles
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { label, isDefault, sortOrder } = await request.json();

    const role = await Role.findById(params.id);
    if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (label !== undefined) {
      const trimmed = label.trim();
      if (!trimmed) return NextResponse.json({ error: 'Label cannot be empty' }, { status: 400 });
      role.label = trimmed;

      if (!role.isSystem) {
        const newName = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (!newName) return NextResponse.json({ error: 'Label must contain valid characters' }, { status: 400 });

        if (newName !== role.name) {
          const conflict = await Role.findOne({ name: newName, _id: { $ne: role._id } });
          if (conflict) return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 });

          // Update all users and RolePermissions that referenced the old name
          await User.updateMany({ role: role.name }, { $set: { role: newName } });
          await RolePermissions.updateMany({ role: role.name }, { $set: { role: newName } });
          role.name = newName;
        }
      }
    }

    if (typeof isDefault === 'boolean') {
      if (isDefault) await Role.updateMany({ _id: { $ne: role._id } }, { $set: { isDefault: false } });
      role.isDefault = isDefault;
    }

    if (typeof sortOrder === 'number') {
      role.sortOrder = sortOrder;
    }

    await role.save();
    return NextResponse.json({ role });
  } catch (err) {
    if (err.code === 11000) return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/roles/[id] — delete a role
// Blocked if isSystem or if any users are still assigned to it
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const role = await Role.findById(params.id);
    if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (role.isSystem)
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 });

    const userCount = await User.countDocuments({ role: role.name });
    if (userCount > 0)
      return NextResponse.json({ error: `${userCount} user${userCount !== 1 ? 's are' : ' is'} assigned to this role. Reassign them first.`, userCount }, { status: 409 });

    await RolePermissions.deleteOne({ role: role.name });
    await Role.findByIdAndDelete(params.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
