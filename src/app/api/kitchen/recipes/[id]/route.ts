import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { KitchenRecipe } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { requirePermission } from '@/lib/requireAuth';

async function getPopulated(id: string) {
  return KitchenRecipe.findById(id)
    .populate('ingredients.stockItem', 'name unit unitCost currentStock minStock')
    .lean();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'view_kitchen');
  if (error) return error;

  await connectDB();
  const recipe = await getPopulated(params.id);
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ recipe });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requirePermission(request, 'manage_kitchen');
  if (guard.error) return guard.error;

  await connectDB();

  const recipe = await KitchenRecipe.findById(params.id);
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const userId = guard.auth.userId;
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
  const { error } = await requirePermission(request, 'manage_kitchen');
  if (error) return error;

  await connectDB();
  await KitchenRecipe.findByIdAndUpdate(params.id, { isActive: false });
  return NextResponse.json({ success: true });
}
