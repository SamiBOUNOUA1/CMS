import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { KitchenRecipe } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';

async function getPopulated(id: string) {
  return KitchenRecipe.findById(id)
    .populate('ingredients.stockItem', 'name unit unitCost currentStock minStock')
    .lean();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permsHeader = request.headers.get('x-user-permissions');
  const perms = permsHeader ? JSON.parse(permsHeader) : {};
  if (!perms.view_kitchen) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const recipe = await getPopulated(params.id);
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ recipe });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permsHeader = request.headers.get('x-user-permissions');
  const perms = permsHeader ? JSON.parse(permsHeader) : {};
  if (!perms.manage_kitchen) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const recipe = await KitchenRecipe.findById(params.id);
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const userId = request.headers.get('x-user-id');
  const body = await request.json();

  const allowed = ['name', 'nameFr', 'category', 'servings', 'description', 'instructions', 'prepTime', 'cookTime', 'isActive'];
  for (const key of allowed) {
    if (key in body) (recipe as any)[key] = body[key];
  }

  if (body.ingredients !== undefined) {
    recipe.ingredients = (body.ingredients || []).map((ing: any) => ({
      stockItem: ing.stockItem,
      quantity: Math.max(0, Number(ing.quantity) || 0),
      unit: ing.unit || '',
    }));
  }

  await recipe.save();

  await logActivity({
    action: 'kitchen_recipe_saved',
    entityType: 'kitchenRecipe',
    entityId: recipe._id,
    entityLabel: recipe.name,
    performedBy: userId,
    metadata: { ingredientCount: recipe.ingredients.length },
  });

  const populated = await getPopulated(String(recipe._id));
  return NextResponse.json({ recipe: populated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const permsHeader = request.headers.get('x-user-permissions');
  const perms = permsHeader ? JSON.parse(permsHeader) : {};
  if (!perms.manage_kitchen) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  await KitchenRecipe.findByIdAndUpdate(params.id, { isActive: false });
  return NextResponse.json({ success: true });
}
