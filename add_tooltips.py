#!/usr/bin/env python3
"""
Add tooltip descriptions and attractor descriptions to main.js
"""

import re

# Attractor descriptions
descriptions = {
    'lorenz': 'The iconic "butterfly effect" discovered by Edward Lorenz in 1963 while studying weather. Shows how tiny changes lead to vastly different outcomes.',
    'rossler': 'Otto Rössler\'s elegant spiral band attractor from 1976. Simpler than Lorenz but equally chaotic with a characteristic twisted ribbon shape.',
    'chen': 'Guanrong Chen\'s 1999 dual-wing attractor that bridges Lorenz and Lü systems. Features symmetric lobes with complex folding dynamics.',
    'aizawa': 'Beautiful torus-knot attractor with intricate winding patterns. Creates mesmerizing 3D spirals that never repeat.',
    'thomas': 'René Thomas\'s cyclically symmetric attractor with trigonometric nonlinearities. Creates closed loop patterns with complex dynamics.',
    'halvorsen': 'Tetrahedral attractor with perfect four-fold rotational symmetry. Discovered while studying computational patterns.',
    'sprott': 'One of Julien Sprott\'s minimal chaotic systems - the simplest possible chaotic flow with just three terms.',
    'dadras': 'Three-scroll attractor discovered by Saeed Dadras. Features three distinct lobes creating complex triple-spiral patterns.',
    'bouali': 'Mohamed Bouali\'s wing-shaped attractor with complex folding structure. Creates elegant butterfly-like forms.',
    'chua': 'Leon Chua\'s electronic circuit attractor from 1983. The iconic double-scroll pattern can be built with physical components.',
    'rabinovich': 'Mikhail Rabinovich\'s attractor from plasma physics and fluid dynamics. Shows multi-scroll behavior with rich dynamics.',
    'nose': 'Nosé-Hoover thermostat from molecular dynamics simulations. Used to model temperature control in particle systems.',
    'burke': 'Burke-Shaw attractor with structure similar to Lorenz but different parameter sensitivity. Creates distinctive wing patterns.',
    'genesio': 'Simple quadratic chaotic system discovered by Roberto Genesio. Minimal equations producing complex behavior.',
    'arneodo': 'Alain Arneodo\'s cubic polynomial attractor. One of the simplest chaotic flows with elegant dynamics.',
    'shimizu': 'Shimizu-Morioka attractor from laser physics. Models the chaotic behavior of lasers with saturable absorbers.',
    'fourwing': 'Stunning four-winged attractor with symmetric multi-scroll structure. Creates intricate four-lobed patterns.',
    'lu': 'Jinhu Lü\'s attractor from 2002 - a "bridge" system connecting Lorenz and Chen families. Exhibits transition dynamics.',
    'rucklidge': 'Alan Rucklidge\'s double-scroll attractor from studies of magnetoconvection. Features two distinct chaotic lobes.',
    'dequan': 'Dequan Li\'s complex multi-scroll attractor with rich parameter space. Creates highly intricate patterns.',
    'tsucs': 'Three-scroll chaotic attractor system with multiple parameter families. Exhibits complex multi-lobe behavior.',
    'newton_leipnik': 'Newton-Leipnik attractor from conservative dynamical systems. Features intricate shearing and attraction dynamics.',
    'clifford': 'Clifford attractors are iterative fractal patterns extended to continuous 3D flow. Creates organic swirling forms.',
    'dejong': 'Peter de Jong\'s classic strange attractor from iterated functions. Extended here to continuous 3D dynamics.',
    'pickover': 'Clifford Pickover\'s "gnarled" attractor with complex 3D structure. Creates twisted, organic-looking patterns.'
}

# Parameter tooltips by attractor
tooltips = {
    'lorenz': [
        'Prandtl number - controls the rate of convective heat transfer. Higher values create more turbulent motion.',
        'Rayleigh number - temperature difference driving the system. The famous chaos threshold is ρ=24.74',
        'Geometric ratio - aspect ratio of the convection cell. Affects the butterfly wing shape.'
    ],
    'rossler': [
        'Stiffness parameter - controls the tightness of spiral winding.',
        'Damping parameter - affects energy dissipation in the system.',
        'Forcing parameter - drives the chaotic behavior. Values above 5 produce more complex patterns.'
    ],
    'chen': [
        'Coupling strength - controls how strongly the variables interact.',
        'Feedback parameter - modulates the nonlinear feedback loops.',
        'Damping coefficient - affects the decay rate and wing symmetry.'
    ],
    'chua': [
        'Alpha - time constant ratio in the circuit model.',
        'Beta - coupling strength between circuit elements.',
        'Slope m₀ - controls the piecewise-linear nonlinearity that creates the double scroll.'
    ],
    'aizawa': [
        'Growth rate - controls the expansion/contraction of orbits.',
        'Offset parameter - shifts the center of the toroidal structure.',
        'Constant term - fine-tunes the winding number of the torus knot.'
    ],
    'thomas': [
        'Dissipation rate - controls energy loss. Very sensitive around 0.208186.',
        'Speed multiplier - scales the overall evolution rate without changing structure.',
        'Chaos factor - modulates the nonlinearity. Values near 1.0 produce clearest cycles.'
    ],
    'halvorsen': [
        'Symmetry parameter - controls the tetrahedral symmetry. Default 1.4 gives perfect four-fold symmetry.',
        'Scale factor - overall size scaling without changing dynamics.',
        'Speed factor - temporal scaling for evolution rate.'
    ]
}

# Read main.js
with open('main.js', 'r') as f:
    content = f.read()

# Add descriptions to attractors
for name, desc in descriptions.items():
    # Find the attractor definition
    pattern = rf"({name}:\s*{{\s*name:\s*'[^']*',)"
    replacement = rf"\1\n        description: '{desc}',"
    content = re.sub(pattern, replacement, content)

print("Descriptions added to attractors")
print("Note: Tooltips need to be added manually to each param array")
print("\nNow update the generateParameterControls function to use tooltips")
