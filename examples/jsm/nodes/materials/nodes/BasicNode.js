import { Node } from '../../core/Node.js';
import { ColorNode } from '../../inputs/ColorNode.js';

class BasicNode extends Node {

	constructor() {

		super();

		this.color = new ColorNode( 0xFFFFFF );

	}

	generate( builder ) {

		let code;

		if ( builder.isShader( 'vertex' ) ) {

			const position = this.position ? this.position.analyzeAndFlow( builder, 'v3', { cache: 'position' } ) : undefined;

			builder.addParsCode( /* glsl */`
				varying vec3 vViewPosition;

				#ifndef FLAT_SHADED

				 varying vec3 vNormal;

				#endif`
			);

			const output = [
				'#include <beginnormal_vertex>',
				'#include <defaultnormal_vertex>',

				'#ifndef FLAT_SHADED', // Normal computed with derivatives when FLAT_SHADED

				' vNormal = normalize( transformedNormal );',

				'#endif',

				'#include <begin_vertex>',
			];

			if ( position ) {

				output.push(
					position.code,
					position.result ? 'transformed = ' + position.result + ';' : ''
				);

			}

			output.push(
				'#include <morphtarget_vertex>',
				'#include <skinning_vertex>',
				'#include <project_vertex>',
				'#include <fog_vertex>',
				'#include <logdepthbuf_vertex>',
				'#include <clipping_planes_vertex>',

				'	vViewPosition = - mvPosition.xyz;',

				'#include <worldpos_vertex>',
				'#include <shadowmap_vertex>'
			);

			code = output.join( '\n' );

		} else {

			// Analyze all nodes to reuse generate codes
			this.color.analyze( builder, { slot: 'color' } );

			if ( this.alpha ) this.alpha.analyze( builder );
			if ( this.mask ) this.mask.analyze( builder );

			// Build code
			const color = this.color.flow( builder, 'c', { slot: 'color' } );
			const alpha = this.alpha ? this.alpha.flow( builder, 'f' ) : undefined;
			const mask = this.mask ? this.mask.flow( builder, 'b' ) : undefined;

			builder.requires.transparent = alpha !== undefined;

			builder.addParsCode( /* glsl */`
				varying vec3 vViewPosition;

				#ifndef FLAT_SHADED

				 varying vec3 vNormal;

				#endif`
			);

			const output = [
				// add before: prevent undeclared normal
				'#include <normal_fragment_begin>',

				color.code,
			];

			if ( mask ) {

				output.push(
					mask.code,
					'if ( ! ' + mask.result + ' ) discard;'
				);

			}

			if ( alpha ) {

				output.push(
					alpha.code,
					'#ifdef ALPHATEST',

					' if ( ' + alpha.result + ' <= ALPHATEST ) discard;',

					'#endif'
				);

			}

			if ( alpha ) {

				output.push( 'gl_FragColor = vec4(' + color.result + ', ' + alpha.result + ' );' );

			} else {

				output.push( 'gl_FragColor = vec4(' + color.result + ', 1.0 );' );

			}

			code = output.join( '\n' );

		}

		return code;

	}

	copy( source ) {

		super.copy( source );

		this.color = source.color;

		if ( source.position ) this.position = source.position;
		if ( source.alpha ) this.alpha = source.alpha;
		if ( source.mask ) this.mask = source.mask;

		return this;

	}

	toJSON( meta ) {

		let data = this.getJSONNode( meta );

		if ( ! data ) {

			data = this.createJSONNode( meta );

			data.color = this.color.toJSON( meta ).uuid;

			if ( this.position ) data.position = this.position.toJSON( meta ).uuid;
			if ( this.alpha ) data.alpha = this.alpha.toJSON( meta ).uuid;
			if ( this.mask ) data.mask = this.mask.toJSON( meta ).uuid;

		}

		return data;

	}

}

BasicNode.prototype.nodeType = 'Basic';

export { BasicNode };
