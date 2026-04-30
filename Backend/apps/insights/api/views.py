import os
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from openai import OpenAI

from apps.projects.models import Project, SavedPublication
from apps.projects.api.views import get_accessible_project

SYSTEM_PROMPT = """Esi mokslinis tyrėjų asistentas, specializuojantis akademinių publikacijų analizėje.
Tavo užduotis — išanalizuoti vartotojo pateiktą akademinių publikacijų rinkinį ir pateikti išsamias, \
struktūruotas įžvalgas lietuvių kalba.

Analizuodamas publikacijas, aptark šiuos aspektus:
1. Pagrindinės temos ir kryptys — kokie pagrindiniai moksliniai klausimai nagrinėjami šiame rinkinyje?
2. Chronologinė raida — kaip kito tyrimų kryptys laikui bėgant?
3. Metodologiniai požiūriai — kokius tyrimo metodus dažniausiai naudoja autoriai?
4. Ryšiai tarp publikacijų — kaip publikacijos papildo viena kitą arba prieštarauja?
5. Mokslinės spragos — ko trūksta šiame rinkinyje, kokie klausimai lieka neatsakyti?
6. Bendros išvados — kokią bendrą mokslinę vertę turi šis publikacijų rinkinys?

Rašyk akademiniu, bet suprantamu stiliumi. Būk konkretus ir remkis pateiktais duomenimis.
Jei publikacijų santraukos nepateiktos, analizuok pagal pavadinimus.
Nenaudok jokio markdown formatavimo — jokių ### antraščių, jokių ** paryškinimų, jokių brūkšnelių sąrašų.
Rašyk grynu tekstu, skirstyk į pastraipas naudodamas tuščias eilutes tarp skyrių.
Kiekvieno skyriaus pradžioje parašyk jo pavadinimą kaip paprastą tekstą, po to dvitaškį."""


def build_user_prompt(publications: list[dict]) -> str:
    lines = [f"Pateikiu {len(publications)} akademinių publikacijų rinkinį analizei:\n"]
    for i, pub in enumerate(publications, 1):
        lines.append(f"[{i}] Pavadinimas: {pub['title']}")
        if pub.get("year"):
            lines.append(f"    Metai: {pub['year']}")
        if pub.get("authors"):
            authors = ", ".join(pub["authors"][:4])
            if len(pub["authors"]) > 4:
                authors += f" ir kt."
            lines.append(f"    Autoriai: {authors}")
        if pub.get("abstract"):
            abstract = pub["abstract"][:600]
            if len(pub["abstract"]) > 600:
                abstract += "..."
            lines.append(f"    Santrauka: {abstract}")
        if pub.get("keywords"):
            lines.append(f"    Raktažodžiai: {', '.join(pub['keywords'][:6])}")
        lines.append("")
    lines.append("Pateik išsamią mokslinę analizę šio publikacijų rinkinio.")
    return "\n".join(lines)


class ProjectInsightsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_accessible_project(request.user, project_id)
        publications = SavedPublication.objects.filter(project=project)

        if not publications.exists():
            return JsonResponse({"error": "Projekte nėra publikacijų analizei"}, status=400)

        pub_data = [
            {
                "title": pub.title,
                "year": pub.year,
                "authors": pub.authors or [],
                "abstract": pub.abstract or "",
                "keywords": [k if isinstance(k, str) else k.get("display_name", "") for k in (pub.keywords or [])],
            }
            for pub in publications
        ]

        user_prompt = build_user_prompt(pub_data)

        try:
            client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
                max_tokens=1500,
            )
            text = response.choices[0].message.content
            return Response({"insights": text})
        except Exception as e:
            return JsonResponse({"error": f"Įžvalgų generavimas nepavyko: {str(e)}"}, status=502)